import React from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	TextField,
	DialogActions,
	Button,
	Tab,
	Tooltip,
	Card,
	CardHeader,
	CardContent,
	Typography
} from '@mui/material'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import HelpIcon from '@mui/icons-material/Help'
import { gitlabConnect } from '../utils/gitlabUtils'
import dayjs from 'dayjs'

function GitlabDialog({
	gitlabDialogOpen,
	setGitlabDialogOpen,
	gitlabUrl,
	setGitlabUrl,
	gitlabAppId,
	setGitlabAppId,
	gitlabSecret,
	setGitlabSecret,
	gitlabRedirectUri,
	setGitlabRedirectUri,
	gitlabExpirationDate,
	setGitlabExpirationDate
}) {
	const [tabValue, setTabValue] = React.useState('1')
	const handleTabChange = (event, newValue) => {
		setTabValue(newValue)
	}

	const handleGitlabConnect = () => {
		// Handle Gitlab OAuth2 logic
		localStorage.setItem('gitlabUrl', gitlabUrl)
		localStorage.setItem('gitlabAppId', gitlabAppId)
		localStorage.setItem('gitlabSecret', gitlabSecret)
		localStorage.setItem('gitlabRedirectUri', gitlabRedirectUri)
		gitlabConnect(gitlabUrl, gitlabAppId, gitlabRedirectUri)
	}

	return (
		<Dialog
			open={gitlabDialogOpen}
			onClose={() => setGitlabDialogOpen(false)}
		>
			<DialogTitle>Connect Gitlab</DialogTitle>
			<TabContext value={tabValue}>
				<TabList
					onChange={handleTabChange}
					aria-label="simple tabs example"
				>
					<Tab label="CONNECT" value="1" />
					<Tooltip title="How to...">
						<Tab icon={<HelpIcon />} value="2" />
					</Tooltip>
				</TabList>
				<TabPanel value="1">
					<DialogContent>
						<DialogContentText>
							Please enter your Gitlab credentials to connect via
							OAuth2.
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
						<TextField
							autoFocus
							margin="dense"
							label="Application ID"
							type="text"
							fullWidth
							variant="outlined"
							value={gitlabAppId}
							onChange={(e) => setGitlabAppId(e.target.value)}
						/>
						<TextField
							autoFocus
							margin="dense"
							label="Gitlab Secret"
							type="password"
							fullWidth
							variant="outlined"
							value={gitlabSecret}
							onChange={(e) => setGitlabSecret(e.target.value)}
						/>
						<TextField
							autoFocus
							margin="dense"
							label="Redirect URI"
							type="url"
							fullWidth
							variant="outlined"
							value={gitlabRedirectUri}
							onChange={(e) =>
								setGitlabRedirectUri(e.target.value)
							}
						/>
						<LocalizationProvider dateAdapter={AdapterDayjs}>
							<DatePicker
								label="Choose your token expiration date"
								value={gitlabExpirationDate}
								maxDate={dayjs().add(1, 'year')}
								onChange={(date) =>
									setGitlabExpirationDate(date)
								}
							/>
						</LocalizationProvider>
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
				</TabPanel>
				<TabPanel value="2">
					<Card>
						<CardHeader
							title="How to get OAuth2 credentials"
							subheader="Secret, Application ID, and Redirect URI"
						/>
						<CardContent>
							<Typography
								variant="body2"
								sx={{ color: 'text.secondary' }}
							>
								To connect to Gitlab, you need to create an
								OAuth2 application in your Gitlab account. This
								will give you a secret, application ID, and
								redirect URI that you can use to connect to Git.
								<br></br> Go to your Gitlab account and create a
								new OAuth2 application under <b>Edit Profile</b>{' '}
								-&gt; <b>Applications</b> -&gt;{' '}
								<b>New Application</b>.<br></br> Uncheck the{' '}
								<b>Confidential</b> box and set the redirect URI
								to your application's URL. (eg.
								http://localhost:3000)
								<br></br> Save the application and you will be
								given a secret and application ID. Use these
								values in the fields to connect to Gitlab.
							</Typography>
						</CardContent>
					</Card>
				</TabPanel>
			</TabContext>
		</Dialog>
	)
}

export default GitlabDialog
