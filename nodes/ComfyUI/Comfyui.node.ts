import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export class Comfyui implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ComfyUI',
		name: 'comfyui',
		icon: 'file:comfyui.svg',
		group: ['transform'],
		version: 1,
		description: 'Execute ComfyUI workflows',
		defaults: {
			name: 'ComfyUI',
		},
		credentials: [
			{
				name: 'comfyUIApi',
				required: true,
			},
		],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Workflow JSON',
				name: 'workflow',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '',
				required: true,
				description: 'The ComfyUI workflow in JSON format',
				},
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					default: 30,
					description: 'Maximum time in minutes to wait for workflow completion',
				},
			],
		};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('comfyUIApi');
		const workflow = this.getNodeParameter('workflow', 0) as string;
		const timeout = this.getNodeParameter('timeout', 0) as number;
		const apiUrl = credentials.apiUrl as string;
		const apiKey = credentials.apiKey as string;

		console.log('[ComfyUI] Executing with API URL:', apiUrl);

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (apiKey) {
			console.log('[ComfyUI] Using API key authentication');
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		try {
			// Check API connection
			console.log('[ComfyUI] Checking API connection...');
			await this.helpers.request({
				method: 'GET',
				url: `${apiUrl}/system_stats`,
				headers,
				json: true,
			});

			// Queue prompt
			console.log('[ComfyUI] Queueing prompt...');
			const response = await this.helpers.request({
				method: 'POST',
				url: `${apiUrl}/prompt`,
				headers,
				body: {
					prompt: JSON.parse(workflow),
				},
				json: true,
			});

			if (!response.prompt_id) {
				throw new NodeApiError(this.getNode(), { message: 'Failed to get prompt ID from ComfyUI' });
			}

			const promptId = response.prompt_id;
			console.log('[ComfyUI] Prompt queued with ID:', promptId);

			// Poll for completion
			let attempts = 0;
			const maxAttempts = 60 * timeout; // Convert minutes to seconds
			await new Promise(resolve => setTimeout(resolve, 5000));
			while (attempts < maxAttempts) {
				console.log(`[ComfyUI] Checking execution status (attempt ${attempts + 1}/${maxAttempts})...`);
				await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 seconds
				attempts++;

				const history = await this.helpers.request({
					method: 'GET',
					url: `${apiUrl}/history/${promptId}`,
					headers,
					json: true,
				});

				const promptResult = history[promptId];
				if (!promptResult) {
					console.log('[ComfyUI] Prompt not found in history');
					continue;
				}

				if (promptResult.status === undefined) {
					console.log('[ComfyUI] Execution status not found');
					continue;
				}
				if (promptResult.status?.completed) {
					console.log('[ComfyUI] Execution completed');

					if (promptResult.status?.status_str === 'error') {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI] Workflow execution failed' });
					}

					// Process outputs
					if (!promptResult.outputs) {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI] No outputs found in workflow result' });
					}

					// Get all image outputs
					const outputs = await Promise.all(
						Object.values(promptResult.outputs)
							.flatMap((nodeOutput: any) => nodeOutput.images || [])
							.filter((image: any) => image.type === 'output' || image.type === 'temp')
							.map(async (image: any) => {
								console.log(`[ComfyUI] Downloading ${image.type} image:`, image.filename);
								let imageUrl = `${apiUrl}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}&type=${image.type || ''}`;


								try {
									const imageData = await this.helpers.request({
										method: 'GET',
										url: imageUrl,
										encoding: null,
										headers,
									});

									return {
										json: {
											filename: image.filename,
											type: image.type,
											subfolder: image.subfolder || '',
											data: imageData.toString('base64'),
										},
									};
								} catch (error) {
									console.error(`[ComfyUI] Failed to download image ${image.filename}:`, error);
									return {
										json: {
											filename: image.filename,
											type: image.type,
											subfolder: image.subfolder || '',
											error: error.message,
										},
									};
								}
							})
					);

					console.log('[ComfyUI] All images downloaded successfully');
					return [outputs];
				}
			}
			throw new NodeApiError(this.getNode(), { message: `Execution timeout after ${timeout} minutes` });
		} catch (error) {
			console.error('[ComfyUI] Execution error:', error);
			throw new NodeApiError(this.getNode(), { message: `ComfyUI API Error: ${error.message}` });
		}
	}
}
