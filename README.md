![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-comfyui-any

This package provides n8n nodes to integrate with [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Support any workflow output.

## Features

- Execute ComfyUI workflows directly from n8n
- Support for workflow JSON import
- Support any workflow output
- Progress monitoring and error handling
- Support for API key authentication
- Configurable timeout settings

## Node Configuration

### ComfyUI Node

This node allows you to execute ComfyUI workflows and Support any workflow output

#### Settings

- **API URL**: The URL of your ComfyUI instance (default: http://127.0.0.1:8188)
- **API Key**: Optional API key if authentication is enabled
- **Workflow JSON**: The ComfyUI workflow in JSON format

#### Outputs
```json
promptResult.outputs
```
## Usage Example

1. Export your workflow from ComfyUI as JSON
2. Create a new workflow in n8n
3. Add the ComfyUI node
4. Paste your workflow JSON
5. Configure the API URL

## Error Handling

The node includes comprehensive error handling for:
- API connection issues
- Invalid workflow JSON
- Execution failures
- Timeout conditions (default 30 minutes)


## License

[MIT](LICENSE.md)
 
