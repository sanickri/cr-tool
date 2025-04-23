import React from 'react'
import PropTypes from 'prop-types'
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
	phabUserPHID,
	setPhabUserPHID,
	updateRevisionsForSource,
	setIsFetching
}) {
	const handlePhabricatorConnect = () => {
		// Handle Phabricator API token logic
		setIsFetching(true)
		localStorage.setItem('phabricatorUrl', phabricatorUrl)
		localStorage.setItem('phabricatorToken', phabricatorToken)
		localStorage.setItem('phabUserPHID', phabUserPHID)
		const phabricatorConfig = {
			phabricatorUrl: phabricatorUrl,
			phabricatorToken: phabricatorToken
		}
		const phabricatorAPI = new PhabricatorAPI(phabricatorConfig)

		phabricatorAPI
			.getUserInfo(phabUserPHID)
			.then((userInfo) => {
				console.log('Phabricator User:', userInfo)
				const user = {
					phid: userInfo[0].phid,
					name: userInfo[0].fields.realName,
					username: userInfo[0].fields.username,
					avatar: userInfo[0].fields.image
				}
				localStorage.setItem('phabUser', JSON.stringify(user))
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
			data-testid="phabricator-dialog"
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
				<DialogContentText>
					Please enter your Phabricator user PHID to connect.
				</DialogContentText>
				<TextField
					autoFocus
					margin="dense"
					label="PHID"
					type="text"
					fullWidth
					variant="outlined"
					value={phabUserPHID}
					onChange={(e) => setPhabUserPHID(e.target.value)}
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

ConnectionStatus.propTypes = {
	setIsPhabConnected: PropTypes.func.isRequired,
	setPhabricatorDialogOpen: PropTypes.func.isRequired,
	phabricatorDialogOpen: PropTypes.bool.isRequired,
	phabricatorUrl: PropTypes.string.isRequired,
	setPhabricatorUrl: PropTypes.func.isRequired,
	phabricatorToken: PropTypes.string.isRequired,
	setPhabricatorToken: PropTypes.func.isRequired,
	phabUserPHID: PropTypes.string.isRequired,
	setPhabUserPHID: PropTypes.func.isRequired,
	updateRevisionsForSource: PropTypes.func.isRequired,
	setIsFetching: PropTypes.func.isRequired
}

export default ConnectionStatus
