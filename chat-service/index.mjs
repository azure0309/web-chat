import AWS from 'aws-sdk';
import {createClient} from 'redis';

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Configure the AWS region
AWS.config.update({region: 'ap-southeast-1'});

// TODO retrieve from secret manager
const queueUrl = 'https://sqs.ap-southeast-1.amazonaws.com/959185761539/chat-app-queue.fifo';

export const send_message = async (event) => {
    const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

    const deduplicationId = 'unique-message-id-' + Date.now();

    // Parameters for sending the message
    const params = {
        MessageBody: event.body,
        QueueUrl: queueUrl,
        MessageGroupId: 'chat-session-1', // The same MessageGroupId ensures message order within the group
        MessageDeduplicationId: deduplicationId // Unique deduplication ID
    };

    try {
        const data = await sqs.sendMessage(params).promise();
        console.log('Message sent successfully, Message ID:', data.MessageId);
        return {
            statusCode: 200,
            body: JSON.stringify('Message sent successfully'),
        };
    } catch (err) {
        console.error('Error sending message:', err);
        return {
            statusCode: 500,
            body: JSON.stringify('Error sending message'),
        };
    }
};

export const get_conversations_list = async (event) => {
    try {
        // Parameters for the DynamoDB scan operation
        const params = {
            TableName: 'ChatMessages'
        };

        // Fetch items from DynamoDB
        const result = await dynamodb.scan(params).promise();

        // Extract unique ConversationID values
        const uniqueConversationIDs = [...new Set(result.Items.map(item => item.ConversationID))];

        // Return the list of conversations
        return {
            statusCode: 200,
            body: JSON.stringify(uniqueConversationIDs),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({message: 'Error fetching conversations'}),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

export const get_messages = async (event) => {
    const conversationId = event.queryStringParameters.conversation_id;
    console.log(conversationId);

    // Validate ConversationID
    if (!conversationId) {
        return {
            statusCode: 400,
            body: JSON.stringify({message: 'ConversationID is required'}),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    try {
        // Parameters for the DynamoDB scan operation
        const params = {
            TableName: 'ChatMessages',
            KeyConditionExpression: 'ConversationID = :conversationId',
            ExpressionAttributeValues: {
                ':conversationId': conversationId
            }
        };

        // Fetch items from DynamoDB
        const result = await dynamodb.query(params).promise();

        // Return the list of conversations
        return {
            statusCode: 200,
            body: JSON.stringify(result.Items),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({message: 'Error fetching conversations'}),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};


// Lambda handler function
export const cache_user_metadata = async (event) => {
    const tableName = 'ChatUsers';
    const event_body = JSON.parse(event.body);
    const updateExpression = 'SET #status = :status';
    const expressionAttributeNames = {
        '#status': 'UserStatus'
    };
    const expressionAttributeValues = {
        ':status': event_body.Status
    };

    const params = {
        TableName: tableName,
        Key: { UserName: event_body.UserName },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW' // Optional: returns the updated item
    };

    try {
        const result = await dynamodb.update(params).promise();
        console.log('Update succeeded:', result);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result.Attributes) // Return updated item
        };
    } catch (error) {
        console.error('Update failed:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Update failed' })
        };
    }
};

export const get_user_metadata = async (event) => {
    const params = {
        TableName: 'ChatUsers',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
            '#status': 'UserStatus',
        },
        ExpressionAttributeValues: {
            ':status': 'active',
        },
    };

    // Fetch items from DynamoDB
    const result = await dynamodb.scan(params).promise();

    const uniqueConversationIDs = [...new Set(result.Items.map(item => item.UserName))];

    // Return the list of conversations
    return {
        statusCode: 200,
        body: JSON.stringify(uniqueConversationIDs),
        headers: {
            'Content-Type': 'application/json'
        }
    }
};
