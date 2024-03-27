const fs = require('fs');
const csv = require('csv-parser');
const yaml = require('js-yaml');

const csvFilePath = 'output.csv'; // Update this path
const yamlFilePath = 'openapi.yaml'; // Update this path
const serviceName = 'cloudhsmv2'; // Update this service name as needed

let yamlObject = {
    components: {
        "x-stackQL-resources": {}
    }
};

function titleOrCamelToSnakeCase(str) {
    return str
      // Insert an underscore before all caps
      .replace(/([A-Z])/g, '_$1')
      // Turn the first character to lowercase
      .replace(/^./, str => str.toLowerCase())
      // Convert the whole string to lowercase and remove any leading underscore
      .toLowerCase()
      .replace(/^_/, '');
  }
 
fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
        // Dynamically set resource key based on the resource name from the CSV row
        const resourceKey = row.resource.toLowerCase();
        if (!yamlObject.components["x-stackQL-resources"][resourceKey]) {
            // If the resource key does not exist, initialize it
            yamlObject.components["x-stackQL-resources"][resourceKey] = {
                name: row.resource,
                methods: {},
                id: `aws.${serviceName}.${resourceKey}`,
                sqlVerbs: {
                    delete: [],
                    insert: [],
                    select: [],
                    update: []
                },
                title: row.resource
            };
        }

        const methodName = titleOrCamelToSnakeCase(row.operationId);
        let methodObject = {
            operation: {
                // '#/paths/~1#X-Amz-Target=BaldrApiService.ModifyBackupAttributes/post'
                $ref: `#/paths/${row.path}/${row.verb}`
            },
            request: {
                mediaType: "application/x-amz-json-1.0"
            },
            response: {
                mediaType: "application/json",
                openAPIDocKey: "200"
            }
        };

        // Add objectKey for 'select' sqlVerb
        if (row.sqlVerb === 'select') {
            methodObject.response.objectKey = '$.ResourceDescriptions';
        }

        // Assign the method object to the corresponding resource and method name
        yamlObject.components["x-stackQL-resources"][resourceKey].methods[methodName] = methodObject;

        // Only add to sqlVerbs if sqlVerb is specified
        if (row.sqlVerb && ['delete', 'insert', 'select', 'update'].includes(row.sqlVerb)) {
            if (!yamlObject.components["x-stackQL-resources"][resourceKey].sqlVerbs[row.sqlVerb].find(ref => ref.$ref === `#/components/x-stackQL-resources/${resourceKey}/methods/${methodName}`)) {
                yamlObject.components["x-stackQL-resources"][resourceKey].sqlVerbs[row.sqlVerb].push({
                    $ref: `#/components/x-stackQL-resources/${resourceKey}/methods/${methodName}`
                });
            }
        }
    })
    .on('end', () => {
        // Convert the JavaScript object to a YAML string.
        const yamlStr = yaml.dump(yamlObject, { noRefs: true });

        // Write the YAML string to the specified output file.
        fs.writeFile(yamlFilePath, yamlStr, 'utf8', (err) => {
            if (err) {
                console.error('Error writing YAML file:', err);
            } else {
                console.log('YAML file has been generated successfully.');
            }
        });
    });
