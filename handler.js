const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const {DynamoDBDocumentClient, PutCommand, ScanCommand} = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const client = new DynamoDBClient({region: "us-east-2"});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "UsersTable";

module.exports.getUsers = async (event) => {
    try {
        const command = new ScanCommand({TableName: TABLE_NAME});
        const response = await docClient.send(command);
        
        return {
            statusCode: 200,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                message: "Lista de usuarios desde DynamoDB",
                technology: "NodeJs",
                method: "GET",
                data: response.Items
            }),
     };
    }catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error al leer de DynamoDB", details: error.message }),
        };
    }

     
};

module.exports.postUsers = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { name, email } = body;

        if (!name || !email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "name y email son requeridos" }),
            };
        }

        const newUser = {
            id: randomUUID(), 
            name: name,
            email: email,
            createdAt: new Date().toISOString()
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: newUser,
        });

        await docClient.send(command);

        return {
            statusCode: 201,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Usuario guardado exitosamente en DynamoDB",
                technology: "NodeJs",
                method: "POST",
                user: newUser,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error al guardar en DynamoDB", details: error.message }),
        };
    }
};
