// slack-daily-reminder.js

// Slack webhook URL - you'll need to replace this with your actual webhook URL
const SLACK_WEBHOOK_URL =
	'https://hooks.slack.com/services/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'

// Message to be sent
const message = {
	text: 'Daily reminder message at 17:00! 🕐'
}

// Function to send message to Slack
async function sendSlackMessage() {
	try {
		const response = await fetch(SLACK_WEBHOOK_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(message)
		})

		if (!response.ok) {
			throw new Error(`Failed to send message: ${response.statusText}`)
		}

		console.log('Message sent successfully!')
	} catch (error) {
		console.error('Error sending message:', error)
	}
}

// Function to check if it's time to send the message
function checkTimeAndSend() {
	const now = new Date()
	const hours = now.getHours()
	const minutes = now.getMinutes()

	if (hours === 17 && minutes === 0) {
		sendSlackMessage()
	}
}

// Check every minute
setInterval(checkTimeAndSend, 60000)

console.log('Slack daily reminder worker started!')
