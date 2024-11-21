import React from 'react'
import {
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	TextField,
	DialogActions
} from '@mui/material'
import PhabricatorAPI from '../utils/phabricatorUtils.js'

function ConnectionStatus({
	setIsPhabConnected,
	setPhabricatorDialogOpen,
	phabricatorDialogOpen,
	phabricatorUrl,
	setPhabricatorUrl,
	phabricatorToken,
	setPhabricatorToken,
	updateRevisionsForSource,
	setIsFetching
}) {
	const handlePhabricatorConnect = () => {
		// Handle Phabricator API token logic
		setIsFetching(true)
		localStorage.setItem('phabricatorUrl', phabricatorUrl)
		localStorage.setItem('phabricatorToken', phabricatorToken)
		const phabricatorConfig = {
			phabricatorUrl: phabricatorUrl,
			phabricatorToken: phabricatorToken
		}
		const phabricatorAPI = new PhabricatorAPI(phabricatorConfig)

		phabricatorAPI
			.getUserInfo(process.env.REACT_APP_PHID)
			.then((userInfo) => {
				console.log('Phabricator User:', userInfo)
				localStorage.setItem('phabUser', JSON.stringify(userInfo))
			})
			.catch((error) => {
				console.error('Error fetching user info:', error)
			})
		phabricatorAPI
			.getTransformedRevisions()
			.then((revs) => {
				updateRevisionsForSource(1, revs)

				console.log('Phabricator Revisions:', revs)
			})
			.catch((error) => {
				console.error('Error fetching revisions:', error)
			})
		setIsPhabConnected(true)
		setIsFetching(false)
		setPhabricatorDialogOpen(false)
	}

	return (
		<Dialog
			open={phabricatorDialogOpen}
			onClose={() => setPhabricatorDialogOpen(false)}
		>
			<DialogTitle>Connect Phabricator</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Please enter your Phabricator API url to connect.
				</DialogContentText>
				<TextField
					autoFocus
					margin="dense"
					label="API url"
					type="text"
					fullWidth
					variant="outlined"
					value={phabricatorUrl}
					onChange={(e) => setPhabricatorUrl(e.target.value)}
				/>
				<DialogContentText>
					Please enter your Phabricator API token to connect.
				</DialogContentText>
				<TextField
					autoFocus
					margin="dense"
					label="API Token"
					type="text"
					fullWidth
					variant="outlined"
					value={phabricatorToken}
					onChange={(e) => setPhabricatorToken(e.target.value)}
				/>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => setPhabricatorDialogOpen(false)}
					color="primary"
				>
					Cancel
				</Button>
				<Button onClick={handlePhabricatorConnect} color="primary">
					Connect
				</Button>
			</DialogActions>
		</Dialog>
	)
}

export default ConnectionStatus
