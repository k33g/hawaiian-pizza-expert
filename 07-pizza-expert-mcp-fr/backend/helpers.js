import * as fs from 'fs'
import * as path from 'path'


/**
 * Reads all text files with specified extensions from a directory and its subdirectories
 * @param {string} dirPath - Path to the directory to start reading from
 * @param {string[]} allowedExtensions - Array of file extensions to include (e.g., ['.md', '.txt'])
 * @param {string} encoding - Character encoding (default: 'utf8')
 * @returns {string[]} - Array of file contents as strings
 */
function readTextFilesRecursively(dirPath, allowedExtensions, encoding = 'utf8') {
  // Normalize inputs
  dirPath = path.resolve(dirPath);
  if (!Array.isArray(allowedExtensions)) {
    allowedExtensions = [allowedExtensions];
  }
  
  // Ensure extensions have leading dots
  allowedExtensions = allowedExtensions.map(ext => 
    ext.startsWith('.') ? ext : '.' + ext
  );
  
  const fileContents = [];
  
  // Helper function to recursively scan directories
  function scanDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(itemPath);
      } else if (stats.isFile()) {
        // Check if file extension matches any in the allowed list
        const ext = path.extname(item).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          try {
            // Read file content
            const content = fs.readFileSync(itemPath, encoding);
            fileContents.push(content);
          } catch (error) {
            console.error(`Error reading file ${itemPath}: ${error.message}`);
          }
        }
      }
    }
  }
  
  // Start scanning from the provided directory
  try {
    scanDirectory(dirPath);
  } catch (error) {
    console.error(`Error accessing directory ${dirPath}: ${error.message}`);
  }
  
  return fileContents;
}

// Example usage:
// const textContents = readTextFilesRecursively('./documents', ['.md', '.txt', '.asciidoc']);
// console.log(`Found ${textContents.length} matching files`);

export {readTextFilesRecursively} ;