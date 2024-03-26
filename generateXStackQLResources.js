const fs = require('fs');
const csv = require('csv-parser');
const yaml = require('js-yaml');

const csvFilePath = 'output.csv'; // Update this path
const yamlFilePath = 'openapi.yaml'; // Update this path

let yamlObject = {
    components: {
        "x-stackQL-resources": {
            resources: {
                name: "resources",
                methods: {},
                id: "aws.cloud_control.resources",
                sqlVerbs: {
                    delete: [],
                    insert: [],
                    select: [],
                    update: []
                },
                title: "resources"
            }
        }
    }
};

fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
        const methodName = row.operationId.toLowerCase() + "_resource";
        let methodObject = {
            operation: {
                $ref: `#/paths/${encodeURIComponent(row.path)}/${row.verb}`
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

        yamlObject.components["x-stackQL-resources"].resources.methods[methodName] = methodObject;

        // Only add to sqlVerbs if sqlVerb is specified
        if (row.sqlVerb && ['delete', 'insert', 'select', 'update'].includes(row.sqlVerb)) {
            if (!yamlObject.components["x-stackQL-resources"].resources.sqlVerbs[row.sqlVerb].find(ref => ref.$ref === `#/components/x-stackQL-resources/resources/methods/${methodName}`)) {
                yamlObject.components["x-stackQL-resources"].resources.sqlVerbs[row.sqlVerb].push({
                    $ref: `#/components/x-stackQL-resources/resources/methods/${methodName}`
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
