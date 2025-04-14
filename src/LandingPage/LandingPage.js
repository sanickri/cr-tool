import React, { useState, useEffect } from 'react'
import {
	Button,
	Alert,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions
} from '@mui/material'
import PhabricatorDialog from './PhabricatorDialog.js'
import RevisionsList from '../Revisions/RevisionsList.js'
import GitlabDialog from './GitlabDialog.js'
import {
	isGitlabTokenValid,
	gitlabCallback,
	getFollowedUsers,
	getMyGitlabUser,
	getTransformedGitlabMRs
} from '../utils/gitlabUtils.js'
import PhabricatorAPI from '../utils/phabricatorUtils.js'
import DownloadIcon from '@mui/icons-material/Download'
import FetchProjectsDialog from './FetchProjectsDialog.js'
import dayjs from 'dayjs'

const LandingPage = ({
	setHasGitProjects,
	setIsPhabConnected,
	setIsGitConnected,
	setProjectIds,
	projectIds,
	setRevisions,
	revisions,
	isGitConnected,
	isPhabConnected,
	setGitlabDialogOpen,
	gitlabDialogOpen,
	setPhabricatorDialogOpen,
	phabricatorDialogOpen,
	hasGitProjects,
	setFetchDialogOpen,
	fetchDialogOpen
}) => {
	const [expiredDialogOpen, setExpiredDialogOpen] =
		useState(!isGitlabTokenValid())

	const [gitlabSecret, setGitlabSecret] = useState(
		process.env.REACT_APP_GITLAB_CLIENT_SECRET || ''
	)
	const [gitlabAppId, setGitlabAppId] = useState(
		process.env.REACT_APP_GITLAB_CLIENT_ID || ''
	)

	const [gitlabRedirectUri, setGitlabRedirectUri] = useState(
		process.env.REACT_APP_GITLAB_REDIRECT_URL || ''
	)

	const [gitlabUrl, setGitlabUrl] = useState(
		process.env.REACT_APP_GITLAB_URL || ''
	)
	const [gitlabExpirationDate, setGitlabExpirationDate] = useState(dayjs())
	const [phabricatorToken, setPhabricatorToken] = useState(
		process.env.REACT_APP_PHABRICATOR_API_TOKEN || ''
	)
	const [phabricatorUrl, setPhabricatorUrl] = useState(
		process.env.REACT_APP_PHABRICATOR_URL || ''
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
					const token = await gitlabCallback(
						code,
						gitlabSecret,
						gitlabAppId,
						gitlabRedirectUri
					)
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

	const openFetchDialog = () => {
		setFetchDialogOpen(true)
	}

	return (
		<div data-testid="landing-page">
			{isFetching && (
				<Alert severity="info" color="info">
					Fetching, please wait...
				</Alert>
			)}
			{isGitConnected && !hasGitProjects && (
				<Button
					variant="contained"
					color="primary"
					onClick={() => setFetchDialogOpen(true)}
				>
					Fetch Git Projects
				</Button>
			)}
			{(isGitConnected || isPhabConnected) && (
				<RevisionsList revisions={revisions} isFetching={isFetching} />
			)}

			<GitlabDialog
				data-testid="gitlab-dialog"
				setGitlabDialogOpen={setGitlabDialogOpen}
				gitlabDialogOpen={gitlabDialogOpen}
				gitlabUrl={gitlabUrl}
				setGitlabUrl={setGitlabUrl}
				gitlabSecret={gitlabSecret}
				setGitlabSecret={setGitlabSecret}
				gitlabAppId={gitlabAppId}
				setGitlabAppId={setGitlabAppId}
				gitlabRedirectUri={gitlabRedirectUri}
				setGitlabRedirectUri={setGitlabRedirectUri}
				gitlabExpirationDate={gitlabExpirationDate}
				setGitlabExpirationDate={setGitlabExpirationDate}
			/>
			<PhabricatorDialog
				data-testid="phabricator-dialog"
				setIsPhabConnected={setIsPhabConnected}
				setPhabricatorDialogOpen={setPhabricatorDialogOpen}
				phabricatorDialogOpen={phabricatorDialogOpen}
				phabricatorUrl={phabricatorUrl}
				setPhabricatorUrl={setPhabricatorUrl}
				phabricatorToken={phabricatorToken}
				setPhabricatorToken={setPhabricatorToken}
				updateRevisionsForSource={updateRevisionsForSource}
				setIsFetching={setIsFetching}
			/>
			<FetchProjectsDialog
				data-testid="fetch-projects-dialog"
				setFetchDialogOpen={setFetchDialogOpen}
				fetchDialogOpen={fetchDialogOpen}
				setHasGitProjects={setHasGitProjects}
				setProjectIds={setProjectIds}
				updateRevisionsForSource={updateRevisionsForSource}
				setIsFetching={setIsFetching}
			/>
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

export default LandingPage
