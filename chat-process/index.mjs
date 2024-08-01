import AWS from 'aws-sdk';

// Destructure the necessary AWS SDK clients
const { DynamoDB } = AWS;
const dynamodb = new DynamoDB.DocumentClient({ region: 'ap-southeast-1' });

export const handler = async (event) => {
    console.log(event);
    for (const record of event.Records) {
        const messageBody = JSON.parse(record.body);
        console.log('Processing message:', messageBody);

        // Extract item data from the event or set up sample data
        const item = {
            ConversationID: messageBody.conversation_id,
            MessageID: `${messageBody.conversation_id}#${messageBody.created_at}`,
            Content: messageBody.content,
            SenderID: messageBody.sender,
            Timestamp: messageBody.created_at
        };

        const params = {
            TableName: 'ChatMessages',
            Item: item
        };

        try {
            await dynamodb.put(params).promise();
            console.log('Item added successfully');
        } catch (error) {
            console.error('Error adding item:', error);
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Messages processed successfully' })
    };


};
