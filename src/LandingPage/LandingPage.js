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
import Revisions from '../Revisions/RevisionsList'
import GitlabDialog from './GitlabDialog.js'
import {
	isGitlabTokenValid,
	gitlabCallback,
	getFollowedUsers,
	getMyGitlabUser,
	getTransformedGitlabMRs
} from '../utils/gitlabUtils'
import PhabricatorAPI from '../utils/phabricatorUtils'
import DownloadIcon from '@mui/icons-material/Download'
import FetchProjectsDialog from './FetchProjectsDialog.js'
import dayjs from 'dayjs'
import TopMenu from './TopMenu.js'

const LandingPage = () => {
	const [gitlabDialogOpen, setGitlabDialogOpen] = useState(false)
	const [phabricatorDialogOpen, setPhabricatorDialogOpen] = useState(false)
	const [fetchDialogOpen, setFetchDialogOpen] = useState(false)
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

	const [isGitConnected, setIsGitConnected] = useState(
		localStorage.getItem('gitlabToken') && isGitlabTokenValid()
			? true
			: false
	)
	const [isPhabConnected, setIsPhabConnected] = useState(
		localStorage.getItem('phabricatorUrl' && 'phabricatorToken')
			? true
			: false
	)

	// TODO: Update the starting state if you'r adding more data sources
	const [revisions, setRevisions] = useState([[], []])
	const [projectIds, setProjectIds] = useState('')
	const [hasGitProjects, setHasGitProjects] = useState(
		localStorage.getItem('gitProjects') ? true : false
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
		<>
			<div style={{ textAlign: 'center', margin: '10px' }}>
				<TopMenu
					setHasGitProjects={setHasGitProjects}
					setIsPhabConnected={setIsPhabConnected}
					setIsGitConnected={setIsGitConnected}
					setProjectIds={setProjectIds}
					setRevisions={setRevisions}
					isGitConnected={isGitConnected}
					isPhabConnected={isPhabConnected}
					setGitlabDialogOpen={setGitlabDialogOpen}
					setPhabricatorDialogOpen={setPhabricatorDialogOpen}
					hasGitProjects={hasGitProjects}
					setFetchDialogOpen={setFetchDialogOpen}
				/>
			</div>

			{isGitConnected && !hasGitProjects && (
				<>
					<div
						style={{
							textAlign: 'center',
							marginBottom: '50px',
							alignContent: 'center'
						}}
					>
						<br />
						<Alert severity="info" color="warning">
							Since there can be a lot of projects and fetching
							can take a while, please fetch your projects now to
							see your revisions. You can refetch at any time.
						</Alert>
						<Alert
							severity="info"
							color="warning"
							sx={{
								margin: '20px',
								display: isFetching ? 'block' : 'none'
							}}
						>
							Fetching, please wait...
						</Alert>
						<CircularProgress
							color="warning"
							sx={{
								display: isFetching ? 'block' : 'none'
							}}
						/>
						<Button
							variant="contained"
							sx={{
								backgroundColor: '#F05032',
								'&:hover': {
									backgroundColor: '#D9432A'
								},
								marginTop: '20px'
							}}
							onClick={openFetchDialog}
							startIcon={<DownloadIcon />}
						>
							Git Projects
						</Button>
					</div>
				</>
			)}
			{(isPhabConnected || isGitConnected) && (
				<>
					<Revisions revisions={revisions} isFetching={isFetching} />
				</>
			)}

			<FetchProjectsDialog
				setFetchDialogOpen={setFetchDialogOpen}
				fetchDialogOpen={fetchDialogOpen}
				projectIds={projectIds}
				setProjectIds={setProjectIds}
				updateRevisionsForSource={updateRevisionsForSource}
				setHasGitProjects={setHasGitProjects}
				setIsFetching={setIsFetching}
			/>

			<GitlabDialog
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
			<Dialog
				open={expiredDialogOpen}
				onClose={() => setExpiredDialogOpen(false)}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">
					{'Giltab Token Expired'}
				</DialogTitle>
				<DialogContent>
					<DialogContentText id="alert-dialog-description">
						Yout Gitlab token has expired. Please reconnect.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setExpiredDialogOpen(false)}>
						Ok
					</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}

export default LandingPage
