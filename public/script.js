document.addEventListener('DOMContentLoaded', async () => {
    // Retrieve username from local storage
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('chatHeaderTitle').textContent = `${username}`;
        fetch('https://vm3b59y71d.execute-api.ap-southeast-1.amazonaws.com/update-status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                UserName: username,
                Status: 'active'
            }),
        })
            .then(response => response.json())
            .then(data => {
                console.log('Message sent:', data);
                // Optionally, handle the server response (e.g., updating the message status)
            })
            .catch((error) => {
                console.error('Error sending message:', error);
                // Optionally, handle the error (e.g., showing an error message to the user)
            });
    } else {
        // Fallback text if no username is found
        document.getElementById('chatHeaderTitle').textContent = 'User name';
    }

    // Add event listener to the Quit button
    document.getElementById('quitButton').addEventListener('click', function() {
        // Remove username from local storage
        localStorage.removeItem('username');
        localStorage.removeItem('activeConversationId');
        fetch('https://vm3b59y71d.execute-api.ap-southeast-1.amazonaws.com/update-status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                UserName: username,
                Status: 'inactive'
            }),
        })
            .then(response => response.json())
            .then(data => {
                console.log('Message sent:', data);
                // Optionally, handle the server response (e.g., updating the message status)
            })
            .catch((error) => {
                console.error('Error sending message:', error);
                // Optionally, handle the error (e.g., showing an error message to the user)
            });

        // Redirect to index page
        window.location.href = 'index.html';
    });

    const conversationsList = document.getElementById('conversationsList');
    const newConversationButton = document.getElementById('newConversationButton');


    try {
        // Fetch unique conversation IDs from the API
        const response = await fetch('https://vm3b59y71d.execute-api.ap-southeast-1.amazonaws.com/get-conversation-list'); // Replace with your actual API endpoint
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const conversationIds = await response.json();

        // Populate the conversations list
        conversationsList.innerHTML = '';

        // Re-add the new conversation button
        conversationsList.appendChild(newConversationButton);

        conversationIds.forEach(conversationId => {
            const conversationItem = document.createElement('div');
            conversationItem.className = 'conversation-item';
            conversationItem.dataset.conversation = conversationId;
            conversationItem.textContent = `${conversationId}`;
            conversationItem.addEventListener('click', () => selectConversation(conversationId));
            conversationsList.appendChild(conversationItem);
        });

        // Load messages for the first conversation by default if any
        if (conversationIds.length > 0) {
            await selectConversation(conversationIds[0]);
        }
    } catch (error) {
        console.error('Error fetching conversation IDs:', error);
    }

    newConversationButton.addEventListener('click', async () => {
        const conversationName = prompt('Enter the name of the new conversation:');
        addConversation(conversationName);
    });

    function addConversation(conversationID) {
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        conversationItem.dataset.conversation = conversationID;
        conversationItem.textContent = conversationID;
        conversationItem.addEventListener('click', () => selectConversation(conversationID));
        conversationsList.appendChild(conversationItem);
    }

});


async function selectConversation(conversationId) {
    const chatMessages = document.getElementById('chatMessages');
    const username = localStorage.getItem('username');

    // Update the selected conversation style
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`[data-conversation="${conversationId}"]`).classList.add('selected');


    try {
        // Fetch messages from API
        const response = await fetch(`https://vm3b59y71d.execute-api.ap-southeast-1.amazonaws.com/get-messages?conversation_id=${conversationId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const messages = await response.json();

        const active_users_response = await fetch(`https://vm3b59y71d.execute-api.ap-southeast-1.amazonaws.com/get-user-metadata`);
        if (!active_users_response.ok) {
            throw new Error('Network response was not ok');
        }

        const active_users = await active_users_response.json();

        // Clear the previous messages
        chatMessages.innerHTML = '';

        // Populate the chat messages
        messages.forEach(message => {
            const messageContainer = document.createElement('div');
            messageContainer.className = 'message-container';

            const senderName = document.createElement('div');
            senderName.className = `sender-name ${active_users.includes(message.SenderID) ? 'active': 'inactive'}`;
            senderName.textContent = `${message.SenderID}`;

            const messageText = document.createElement('div');
            messageText.className = `message ${message.SenderID === username ? 'sent' : 'received'}`;
            messageText.textContent = message.Content;

            const messageTimestamp = document.createElement('div');
            messageTimestamp.className = 'message-timestamp';
            messageTimestamp.textContent = new Date(message.Timestamp).toLocaleString(); // Adjust format as needed

            messageContainer.appendChild(senderName);
            messageContainer.appendChild(messageText);
            messageContainer.appendChild(messageTimestamp);
            chatMessages.appendChild(messageContainer);

        });
        localStorage.setItem('activeConversationId', conversationId); // Store in local storage

    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const conversationItems = document.querySelectorAll('.conversation-item');

    conversationItems.forEach(item => {
        item.addEventListener('click', () => {
            document.querySelector('.conversation-item.active').classList.remove('active');
            item.classList.add('active');
        });
    });

    sendButton.addEventListener('click', () => {
        sendMessage();
    });

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        const activeConversationId = localStorage.getItem('activeConversationId');
        const username = localStorage.getItem('username');

        if (messageText !== '') {
            addMessage(messageText, 'sent');
            messageInput.value = '';

            // Send message to server
            fetch('https://vm3b59y71d.execute-api.ap-southeast-1.amazonaws.com/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: activeConversationId,
                    sender: username,
                    content: messageText,
                    created_at: new Date().getTime()
                }),
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Message sent:', data);
                    // Optionally, handle the server response (e.g., updating the message status)
                })
                .catch((error) => {
                    console.error('Error sending message:', error);
                    // Optionally, handle the error (e.g., showing an error message to the user)
                });
        }
    }

    function addMessage(text, type) {
        const message = document.createElement('div');
        message.classList.add('message', type);
        message.textContent = text;
        chatMessages.appendChild(message);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
    }
});
