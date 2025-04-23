import React, { useState, useEffect } from 'react'
import {
	Button,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions
} from '@mui/material'
import RevisionsList from '../Revisions/RevisionsList.js'
import {
	isGitlabTokenValid,
	gitlabCallback,
	getFollowedUsers,
	getMyGitlabUser,
	getTransformedGitlabMRs
} from '../utils/gitlabUtils.js'
import PhabricatorAPI from '../utils/phabricatorUtils.js'
import PropTypes from 'prop-types'

const LandingPage = ({
	setIsPhabConnected,
	setIsGitConnected,
	setRevisions,
	revisions,
	isGitConnected,
	isPhabConnected
}) => {
	const [expiredDialogOpen, setExpiredDialogOpen] =
		useState(!isGitlabTokenValid())

	const [phabricatorToken, setPhabricatorToken] = useState(
		localStorage.getItem('phabricatorToken') || ''
	)
	const [phabricatorUrl, setPhabricatorUrl] = useState(
		localStorage.getItem('phabricatorUrl') || ''
	)

	const [isFetching, setIsFetching] = useState(false)

	const updateRevisionsForSource = (sourceIndex, newRevs) => {
		setRevisions((prevRevisions) => {
			const updatedRevisions = [...prevRevisions]
			const existingRevs = updatedRevisions[sourceIndex]
			const uniqueNewRevs = newRevs.filter(
				(newRev) => !existingRevs.some((rev) => rev.id === newRev.id)
			)
			updatedRevisions[sourceIndex] = [...existingRevs, ...uniqueNewRevs]
			return updatedRevisions
		})
	}

	useEffect(() => {
		const handleGitlabCallback = async (setIsGitConnected) => {
			setIsFetching(true)
			const urlParams = new URLSearchParams(window.location.search)
			const code = urlParams.get('code')
			let user = localStorage.getItem('gitlabUser')
			if (code) {
				try {
					const token = await gitlabCallback(code)
					if (token) {
						setIsGitConnected(true)
						window.history.replaceState(
							{},
							document.title,
							window.location.pathname
						)
					}
					user = await getMyGitlabUser()
					const followedUsers = await getFollowedUsers()
					console.log('Followed Users:', followedUsers)
				} catch (error) {
					console.error('Error during Gitlab callback:', error)
				}
			}
			if (user) {
				const revs = await getTransformedGitlabMRs()
				updateRevisionsForSource(0, revs)
			}
			setIsFetching(false)
		}

		handleGitlabCallback(setIsGitConnected, revisions, setRevisions)
		const savedUrl = localStorage.getItem('phabricatorUrl')
		const savedToken = localStorage.getItem('phabricatorToken')

		const handleFetchPhabricatorRevisions = async () => {
			setIsFetching(true)
			const phabricatorConfig = {
				phabricatorUrl: phabricatorUrl,
				phabricatorToken: phabricatorToken
			}
			const phabricatorAPI = new PhabricatorAPI(phabricatorConfig)
			const revs = await phabricatorAPI.getTransformedRevisions()
			updateRevisionsForSource(1, revs)
			setIsPhabConnected(true)
			setIsFetching(false)
		}

		if (savedUrl && savedToken) {
			setPhabricatorUrl(savedUrl)
			setPhabricatorToken(savedToken)
			handleFetchPhabricatorRevisions()
		}
	}, [])

	return (
		<div data-testid="landing-page">
			{isFetching && (
				<Alert severity="info" color="info">
					Fetching, please wait...
				</Alert>
			)}
			{(isGitConnected || isPhabConnected) && (
				<RevisionsList revisions={revisions} isFetching={isFetching} />
			)}

			<Dialog
				open={expiredDialogOpen}
				onClose={() => setExpiredDialogOpen(false)}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">
					{'GitLab Token Expired'}
				</DialogTitle>
				<DialogContent>
					<DialogContentText id="alert-dialog-description">
						Your GitLab token has expired. Please reconnect.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setExpiredDialogOpen(false)}>
						Close
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	)
}

LandingPage.propTypes = {
	setIsPhabConnected: PropTypes.func.isRequired,
	setIsGitConnected: PropTypes.func.isRequired,
	setRevisions: PropTypes.func.isRequired,
	revisions: PropTypes.array.isRequired,
	isGitConnected: PropTypes.bool.isRequired,
	isPhabConnected: PropTypes.bool.isRequired
}

export default LandingPage
