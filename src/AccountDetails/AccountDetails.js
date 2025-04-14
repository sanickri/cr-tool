import React, { useEffect, useState } from 'react'
import {
	Box,
	Button,
	Card,
	CardContent,
	CardHeader,
	Chip,
	Container,
	Divider,
	IconButton,
	Paper,
	Stack,
	TextField,
	Typography,
	Grid
} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FolderIcon from '@mui/icons-material/Folder'
import GroupsIcon from '@mui/icons-material/Groups'

const AccountDetails = () => {
	const [connectedAccounts, setConnectedAccounts] = useState({
		gitlab: null,
		phab: null
	})
	const [userGroups, setUserGroups] = useState([])
	const [projectGroups, setProjectGroups] = useState([])
	const [newUserGroup, setNewUserGroup] = useState({ name: '', users: '' })
	const [newProjectGroup, setNewProjectGroup] = useState({
		name: '',
		projects: ''
	})

	useEffect(() => {
		const gitlabUser = localStorage.getItem('gitlabUser')
		const phabUser = localStorage.getItem('phabUser')
		const savedUserGroups = JSON.parse(
			localStorage.getItem('userGroups') || '[]'
		)
		const savedProjectGroups = JSON.parse(
			localStorage.getItem('projectGroups') || '[]'
		)

		setConnectedAccounts({
			gitlab: gitlabUser ? JSON.parse(gitlabUser) : null,
			phab: phabUser ? JSON.parse(phabUser) : null
		})
		setUserGroups(savedUserGroups)
		setProjectGroups(savedProjectGroups)
	}, [])

	const handleEditUserGroupClick = (index) => {
		const group = userGroups[index]
		// Convert users array to comma-separated string for editing
		const editableGroup = {
			...group,
			users: Array.isArray(group.users)
				? group.users.join(', ')
				: group.users
		}
		setNewUserGroup(editableGroup)
		handleDeleteUserGroup(index)
	}

	const handleAddUserGroup = () => {
		if (newUserGroup && newUserGroup.name && newUserGroup.users) {
			console.log(newUserGroup)
			// Handle users array or string
			let processedUsers
			if (typeof newUserGroup.users === 'string') {
				processedUsers = newUserGroup.users
					.split(',')
					.map((user) => user.trim())
			} else if (Array.isArray(newUserGroup.users)) {
				processedUsers = newUserGroup.users
			} else {
				// If neither string nor array, set empty array
				processedUsers = []
			}

			const groupToSave = {
				name: newUserGroup.name,
				users: processedUsers
			}

			const updatedGroups = [...userGroups, groupToSave]
			setUserGroups(updatedGroups)
			localStorage.setItem('userGroups', JSON.stringify(updatedGroups))
			setNewUserGroup({ name: '', users: '' })
		}
	}

	const handleAddProjectGroup = () => {
		if (
			newProjectGroup &&
			newProjectGroup.name &&
			newProjectGroup.projects &&
			typeof newProjectGroup.projects === 'string' &&
			newProjectGroup.projects.length > 0
		) {
			const processedProjects = newProjectGroup.projects
				.split(',')
				.map((project) => project.trim())
				.filter((project) => project)

			const groupToSave = {
				name: newProjectGroup.name,
				projects: processedProjects
			}

			const updatedGroups = [...projectGroups, groupToSave]
			setProjectGroups(updatedGroups)
			localStorage.setItem('projectGroups', JSON.stringify(updatedGroups))
			setNewProjectGroup({ name: '', projects: '' })
		}
	}

	const handleEditUserGroup = (index) => {
		const updatedGroups = userGroups.map((group, i) => {
			if (i === index) {
				return newUserGroup
			}
			return group
		})
		setUserGroups(updatedGroups)
		localStorage.setItem('userGroups', JSON.stringify(updatedGroups))
	}

	const handleEditProjectGroup = (index) => {
		const updatedGroups = projectGroups.map((group, i) => {
			if (i === index) {
				return newProjectGroup
			}
			return group
		})
		setProjectGroups(updatedGroups)
		localStorage.setItem('projectGroups', JSON.stringify(updatedGroups))
	}

	const handleDeleteUserGroup = (index) => {
		const updatedGroups = userGroups.filter((_, i) => i !== index)
		setUserGroups(updatedGroups)
		localStorage.setItem('userGroups', JSON.stringify(updatedGroups))
	}

	const handleDeleteProjectGroup = (index) => {
		const updatedGroups = projectGroups.filter((_, i) => i !== index)
		setProjectGroups(updatedGroups)
		localStorage.setItem('projectGroups', JSON.stringify(updatedGroups))
	}

	return (
		<Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
			<Typography variant="h4" gutterBottom>
				Account Details
			</Typography>

			{/* Connected Accounts Section */}
			<Paper elevation={3} sx={{ p: 3, mb: 4 }}>
				<Typography
					variant="h5"
					gutterBottom
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					<AccountCircleIcon sx={{ mr: 1 }} />
					Connected Accounts
				</Typography>
				<Grid container spacing={3}>
					<Grid item xs={12} md={6}>
						<Card>
							<CardHeader title="GitLab" />
							<CardContent>
								{connectedAccounts.gitlab ? (
									<>
										<Typography>
											Name:{' '}
											{connectedAccounts.gitlab.name}
										</Typography>
										<Typography>
											Username:{' '}
											{connectedAccounts.gitlab.username}
										</Typography>
										<Typography>
											Email:{' '}
											{connectedAccounts.gitlab.email}
										</Typography>
									</>
								) : (
									<Typography color="text.secondary">
										No GitLab account connected
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} md={6}>
						<Card>
							<CardHeader title="Phabricator" />
							<CardContent>
								{connectedAccounts.phab ? (
									<>
										<Typography>
											Name: {connectedAccounts.phab.name}
										</Typography>
										<Typography>
											Username:{' '}
											{connectedAccounts.phab.username}
										</Typography>
										<Typography>
											Email:{' '}
											{connectedAccounts.phab.email}
										</Typography>
									</>
								) : (
									<Typography color="text.secondary">
										No Phabricator account connected
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</Paper>

			{/* User Groups Section */}
			<Paper elevation={3} sx={{ p: 3, mb: 4 }}>
				<Typography
					variant="h5"
					gutterBottom
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					<GroupsIcon sx={{ mr: 1 }} />
					User Groups
				</Typography>
				<Box sx={{ mb: 12 }}>
					<Grid container spacing={2} sx={{ mb: 2 }} size="auto">
						<TextField
							fullWidth
							label="Users (comma-separated)"
							value={newUserGroup.users}
							onChange={(e) =>
								setNewUserGroup({
									...newUserGroup,
									users: e.target.value
								})
							}
							multiline
							rows={4}
							size="large"
						/>
					</Grid>
					<Grid container spacing={2}>
						<Grid item xs={12} md={4}>
							<TextField
								fullWidth
								label="Group Name"
								value={newUserGroup.name}
								onChange={(e) =>
									setNewUserGroup({
										...newUserGroup,
										name: e.target.value
									})
								}
							/>
						</Grid>
						<Grid item xs={12} md={2}>
							<Button
								fullWidth
								variant="contained"
								onClick={handleAddUserGroup}
								sx={{ height: '56px' }}
							>
								Add Group
							</Button>
						</Grid>
					</Grid>
				</Box>
				<Grid container spacing={2}>
					{userGroups.map((group, index) => (
						<Grid item xs={12} md={4} key={index}>
							<Card>
								<CardHeader
									title={group.name}
									action={
										<>
											<IconButton
												onClick={() =>
													handleDeleteUserGroup(index)
												}
											>
												<DeleteIcon />
											</IconButton>
											<IconButton
												onClick={() =>
													handleEditUserGroupClick(
														index
													)
												}
											>
												<EditIcon />
											</IconButton>
										</>
									}
								/>
								<Divider />
								<CardContent>
									<Box
										sx={{
											display: 'flex',
											flexWrap: 'wrap',
											gap: 1
										}}
									>
										{group.users.map((user, i) => (
											<Chip key={i} label={user} />
										))}
									</Box>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>
			</Paper>

			{/* Project Groups Section */}
			<Paper elevation={3} sx={{ p: 3 }}>
				<Typography
					variant="h5"
					gutterBottom
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					<FolderIcon sx={{ mr: 1 }} />
					Project Groups
				</Typography>
				<Box sx={{ mb: 3 }}>
					<Grid container spacing={2}>
						<Grid item xs={12} md={4}>
							<TextField
								fullWidth
								label="Group Name"
								value={newProjectGroup.name}
								onChange={(e) =>
									setNewProjectGroup({
										...newProjectGroup,
										name: e.target.value
									})
								}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								fullWidth
								label="Projects (comma-separated)"
								value={newProjectGroup.projects}
								onChange={(e) =>
									setNewProjectGroup({
										...newProjectGroup,
										projects: e.target.value
									})
								}
							/>
						</Grid>
						<Grid item xs={12} md={2}>
							<Button
								fullWidth
								variant="contained"
								onClick={handleAddProjectGroup}
								sx={{ height: '56px' }}
							>
								Add Group
							</Button>
						</Grid>
					</Grid>
				</Box>
				<Grid container spacing={2}>
					{projectGroups.map((group, index) => (
						<Grid item xs={12} md={4} key={index}>
							<Card>
								<CardHeader
									title={group.name}
									action={
										<IconButton
											onClick={() =>
												handleDeleteProjectGroup(index)
											}
										>
											<DeleteIcon />
										</IconButton>
									}
								/>
								<Divider />
								<CardContent>
									<Box
										sx={{
											display: 'flex',
											flexWrap: 'wrap',
											gap: 1
										}}
									>
										{group.projects.map((project, i) => (
											<Chip key={i} label={project} />
										))}
									</Box>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>
			</Paper>
		</Container>
	)
}

export default AccountDetails
