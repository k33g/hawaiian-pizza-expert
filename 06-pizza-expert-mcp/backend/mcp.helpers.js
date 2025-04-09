//* Helpers for MCP
import { z } from "zod";
import { tool } from "@langchain/core/tools"


/**
 * Function to transform MCP tools into Langchain tools
 * @param {object} mcpTools - The MCP tools object
 * @returns {Array} - An array of Langchain tools
 */
function transformToLangchainTools(mcpTools) {
  console.log("🟢🛠️✅ Available Tools:");
  mcpTools.tools.forEach((tool) => {
    console.log("  🔨 tool:", tool.name);
    console.log("  🔨 schema:", tool.inputSchema);
  });

  //! Transform MCP Tools to Dynamic Tools (Langchain Tools)
  let langchainTools = mcpTools.tools.map((mcpTool) => {
    return tool(null, {
      name: mcpTool.name,
      description: mcpTool.description || "No description provided",
      schema: jsonSchemaToZod(mcpTool.inputSchema),
    });
  });

  return langchainTools;
}


/**
 * Function to fetch the list of tools
 * @returns {Promise<object>} - A promise that resolves to the list of tools
 */
async function fetchTools(mcpClient) {
  try {
    console.log("🔍 Fetching available tools...");
    const result = await mcpClient.listTools();
    return result;
  } catch (error) {
    console.error("❌ Error fetching tools:", error);
  }
}

/**
 * Convert a JSON Schema object to a Zod schema object.
 * @param {object} jsonSchema - The JSON Schema object to convert
 * @returns {object} - The Zod schema object
 */
function jsonSchemaToZod(jsonSchema) {
  if (!jsonSchema || jsonSchema.type !== "object" || !jsonSchema.properties) {
    return z.object({});
  }

  const shape = {};
  for (const [key, value] of Object.entries(jsonSchema.properties)) {
    let zodType;

    // Map JSON Schema types to Zod types
    switch (value.type) {
      case "string":
        zodType = z.string();
        break;
      case "number":
        zodType = z.number();
        break;
      case "integer":
        zodType = z.number().int();
        break;
      case "boolean":
        zodType = z.boolean();
        break;
      case "array":
        zodType = z.array(jsonSchemaToZod(value.items));
        break;
      case "object":
        zodType = jsonSchemaToZod(value);
        break;
      default:
        zodType = z.any(); // Default case if type is unknown
    }

    // Add optionality if `required` is missing
    if (!jsonSchema.required?.includes(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return z.object(shape);
}

export { fetchTools, transformToLangchainTools };
