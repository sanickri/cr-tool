import React from 'react'
import {
	Typography,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	TextField,
	DialogActions
} from '@mui/material'
import { gitlabConnect } from '../utils/gitlabUtils'
import PhabricatorAPI from '../utils/phabricatorUtils'

function ConnectionStatus({
	isGitConnected,
	isPhabConnected,
	setIsPhabConnected,
	setGitlabDialogOpen,
	setPhabricatorDialogOpen,
	gitlabDialogOpen,
	phabricatorDialogOpen,
	gitlabUrl,
	setGitlabUrl,
	phabricatorUrl,
	setPhabricatorUrl,
	phabricatorToken,
	setPhabricatorToken,
	setRevisions,
	setAllPhabUsers
}) {
	const handleGitlabConnect = () => {
		// Handle Gitlab OAuth2 logic
		localStorage.setItem('gitlabUrl', gitlabUrl)
		gitlabConnect(gitlabUrl)
	}

	const handlePhabricatorConnect = () => {
		// Handle Phabricator API token logic
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
			.getRevisions()
			.then((revisions) => {
				setRevisions(revisions)
				console.log('Phabricator Revisions:', revisions)
			})
			.catch((error) => {
				console.error('Error fetching revisions:', error)
			})
		phabricatorAPI.getUserInfo().then((users) => {
			setAllPhabUsers(users)
		})
		setIsPhabConnected(true)
		setPhabricatorDialogOpen(false)
	}

	return (
		<div style={{ textAlign: 'center', marginTop: '50px' }}>
			{!isGitConnected && !isPhabConnected ? (
				<>
					<Typography variant="h4" gutterBottom>
						Connect your profiles
					</Typography>
					<Button
						variant="contained"
						sx={{
							backgroundColor: '#F05032',
							'&:hover': {
								backgroundColor: '#D9432A'
							}
						}}
						onClick={() => setGitlabDialogOpen(true)}
						style={{ marginRight: '20px' }}
					>
						Connect Git
					</Button>
					OR &nbsp;&nbsp;&nbsp;
					<Button
						variant="contained"
						color="primary"
						onClick={() => setPhabricatorDialogOpen(true)}
					>
						Connect Phabricator
					</Button>
				</>
			) : (
				<Typography variant="h6" gutterBottom>
					{isGitConnected && isPhabConnected
						? "You're connected to both Git and Phabricator."
						: isGitConnected
							? "You're connected to Git."
							: "You're connected to Phabricator."}
				</Typography>
			)}

			{/* Gitlab Dialog */}
			<Dialog
				open={gitlabDialogOpen}
				onClose={() => setGitlabDialogOpen(false)}
			>
				<DialogTitle>Connect Gitlab</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Please enter your Gitlab URL to connect via OAuth2.
					</DialogContentText>
					<TextField
						autoFocus
						margin="dense"
						label="Gitlab URL"
						type="url"
						fullWidth
						variant="outlined"
						value={gitlabUrl}
						onChange={(e) => setGitlabUrl(e.target.value)}
					/>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setGitlabDialogOpen(false)}
						color="primary"
					>
						Cancel
					</Button>
					<Button onClick={handleGitlabConnect} color="primary">
						Connect
					</Button>
				</DialogActions>
			</Dialog>

			{/* Phabricator Dialog */}
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
		</div>
	)
}

export default ConnectionStatus
