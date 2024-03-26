const fs = require('fs');
const yaml = require('yaml');

// Function to read and parse the OpenAPI YAML file
function parseOpenAPIYAML(filePath) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(fileContents);
}

// Function to extract required information and generate CSV content
// Function to extract required information and generate CSV content
function generateCSVContent(openAPIData) {
    let csvContent = "operationId,path,verb,description\n"; // CSV header

    for (const path in openAPIData.paths) {
        const methods = openAPIData.paths[path];
        for (const verb in methods) {
            // Skip 'parameters' or any other non-HTTP method entries
            if (verb === 'parameters') continue;

            const operation = methods[verb];
            const operationId = operation.operationId || '';
            const description = operation.description ? operation.description.replace(/\s+/g, ' ').trim() : '';
            csvContent += `"${operationId}","${path}","${verb}","${description}"\n`;
        }
    }

    return csvContent;
}

// Function to write CSV content to a file
function writeCSVFile(csvContent, outputFilePath) {
    fs.writeFileSync(outputFilePath, csvContent, 'utf8');
}

// Main function to process the OpenAPI file and generate a CSV file
function processOpenAPIFile(openAPIFilePath, outputCSVFilePath) {
    try {
        const openAPIData = parseOpenAPIYAML(openAPIFilePath);
        const csvContent = generateCSVContent(openAPIData);
        writeCSVFile(csvContent, outputCSVFilePath);
        console.log('CSV file has been generated successfully.');
    } catch (error) {
        console.error('Error processing OpenAPI file:', error);
    }
}

processOpenAPIFile('openapi-directory/APIs/amazonaws.com/cloudhsmv2/2017-04-28/openapi.yaml', 'output.csv');

