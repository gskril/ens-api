require('dotenv').config()
const express = require('express')
const app = express()
const port = process.env.PORT || 3000

const ethers = require('ethers')

const provider = new ethers.providers.InfuraProvider('homestead', {
	projectId: process.env.INFURA_PROJECT_ID,
	projectSecret: process.env.INFURA_PROJECT_SECRET,
})

app.listen(port, () => {
	console.log(`Your application is running on port ${port}`)
})

app.get('/:address', async (req, res) => {
	const startTime = Date.now()
	let name = req.params.address
	const requestingAvatar = req.query.avatar !== undefined ? true : false

	if (ethers.utils.isAddress(name)) {
		name = await provider.lookupAddress(name)
	}

	if (name === null || name === 'favicon.ico') {
		return res.status(404).send({ error: 'Address not found' })
	}

	const resolver = await provider.getResolver(name)

	if (resolver === null) {
		return res.status(404).send({ error: 'Address not found' })
	}

	const avatar = requestingAvatar ? await resolver.getAvatar() : null

	const records = {
		name: name,
		description: await resolver.getText('description'),
		avatar: requestingAvatar ? avatar.url : null,
		url: await resolver.getText('url'),
		telegram: await resolver.getText('org.telegram'),
		twitter: await resolver.getText('com.twitter'),
		github: await resolver.getText('com.github'),
		email: await resolver.getText('email'),
	}

	const endTime = Date.now()
	const duration = endTime - startTime

	res.status(200)
	res.json({
		records: records,
		time: duration,
	})
})
