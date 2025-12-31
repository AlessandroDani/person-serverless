const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const {DynamoDBDocumentClient, PutCommand, ScanCommand} = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const client = new DynamoDBClient({region: "us-east-2"});
const docClient = DynamoDBDocumentClient.from(client);

const AWS = require('aws-sdk');
const sqs = new AWS.SQS();
const sns = new AWS.SNS();

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

        await sqs.sendMessage({
            QueueUrl: process.env.SQS_URL,
            MessageBody: JSON.stringify(newUser),
        }).promise();

        return {
            statusCode: 201,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Usuario creado y encolado exitosamente",
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
}

    module.exports.sendEmailWorker = async (event) => {
        for (const record of event.Records) {
        const userData = JSON.parse(record.body);
        
        console.log("Procesando mensaje de SQS para:", userData.email);

        const params = {
            Message: `Bienvenido ${userData.name}, tu cuenta ha sido creada exitosamente.`,
            Subject: "Registro Exitoso",
            TopicArn: process.env.SNS_TOPIC_ARN
        };

        await sns.publish(params).promise();
    }
}
