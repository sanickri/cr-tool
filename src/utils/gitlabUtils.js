import dayjs from 'dayjs'
import dotenv from 'dotenv'
import React from 'react'
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle
} from '@mui/material'
dotenv.config()

// Helper function to map access level to role name
function getRoleName(accessLevel) {
	switch (accessLevel) {
		case 30:
			return 'developer'
		case 40:
			return 'maintainer'
		case 50:
			return 'owner'
		default:
			return null
	}
}

const isGitlabTokenValid = () => {
	const gitlabToken = JSON.parse(localStorage.getItem('gitlabToken'))
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	let open = false
	if (!gitlabToken || !gitlabUrl) {
		return false
	}
	try {
		const today = dayjs()
		const expires = dayjs(gitlabToken.expires)
		if (today.isAfter(expires)) {
			open = true
			return (
				<Dialog
					open={open}
					onClose={(open = false)}
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
						<Button onClick={(open = false)}>Ok</Button>
					</DialogActions>
				</Dialog>
			)
		}
		return true
	} catch (error) {
		console.error('Error checking Gitlab token:', error)
		return false
	}
}

const gitlabConnect = (gitlabUrl, gitlabAppId, gitlabRedirectUri) => {
	const gitlabAuthUrl = `${gitlabUrl}/oauth/authorize?client_id=${gitlabAppId}&redirect_uri=${gitlabRedirectUri}&response_type=code&scope=api`

	window.location.href = gitlabAuthUrl
}

const gitlabCallback = async (
	code,
	gitlabSecret,
	gitlabAppId,
	gitlabRedirectUri
) => {
	const response = await fetch(
		`${localStorage.getItem('gitlabUrl')}/oauth/token`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: gitlabAppId,
				client_secret: gitlabSecret,
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: gitlabRedirectUri
			})
		}
	)
	const data = await response.json()
	if (data.access_token) {
		const token = {
			token: data.access_token,
			expires: dayjs().add(data.expires_in, 'seconds')
		}
		localStorage.setItem('gitlabToken', JSON.stringify(token))
		return data.access_token
	} else {
		throw new Error('Failed to obtain access token')
	}
}

async function getMyGitlabUser() {
	const gitlabToken = JSON.parse(localStorage.getItem('gitlabToken')).token
	const gitlabUrl = localStorage.getItem('gitlabUrl')
	if (!gitlabToken || !gitlabUrl) {
		return console.error('No Gitlab token or URL')
	}
	try {
		const response = await fetch(`${gitlabUrl}/api/v4/user`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${gitlabToken}`
			}
		})

		if (!response.ok) {
			throw new Error(`Error fetching user: ${response.statusText}`)
		}

		const user = await response.json()
		console.log('Gitlab User:', user)
		localStorage.setItem('gitlabUser', JSON.stringify(user))
		return user
	} catch (error) {
		console.error('Error fetching user:', error)
		return {}
	}
}

async function getGitlabProjects() {
	const gitlabToken = JSON.parse(localStorage.getItem('gitlabToken')).token
	const gitlabUser = JSON.parse(localStorage.getItem('gitlabUser'))
	const gitlabUrl = localStorage.getItem('gitlabUrl')
	const roles = ['developer', 'owner', 'maintainer']
	let allProjects = []
	let page = 1

	try {
		if (!gitlabUser) return null

		while (true) {
			const response = await fetch(
				`${gitlabUrl}/api/v4/projects?membership=true&per_page=100&page=${page}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${gitlabToken}`
					}
				}
			)

			if (!response.ok) {
				throw new Error(
					`Error fetching projects: ${response.statusText}`
				)
			}

			const projects = await response.json()

			if (projects.length === 0) {
				break
			}

			// Filter projects based on the user's role
			const userProjects = projects.filter((project) => {
				const userRole =
					project.permissions?.project_access?.access_level
				return roles.includes(getRoleName(userRole))
			})

			allProjects = allProjects.concat(userProjects)
			page++
		}

		console.log('Gitlab Projects:', allProjects)
		return allProjects
	} catch (error) {
		console.error('Error fetching projects:', error)
		return []
	}
}

const getProjectsByIds = async (ids) => {
	const gitlabToken = JSON.parse(localStorage.getItem('gitlabToken')).token
	const gitlabUrl = localStorage.getItem('gitlabUrl')
	const newIds = ids
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id)

	try {
		const fetchedProjects = await Promise.all(
			newIds.map(async (id) => {
				const response = await fetch(
					`${gitlabUrl}/api/v4/projects/${id}`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${gitlabToken}`
						}
					}
				)

				if (!response.ok) {
					throw new Error(
						`Error fetching project with ID ${id}: ${response.statusText}`
					)
				}

				return await response.json()
			})
		)

		return fetchedProjects
	} catch (error) {
		console.error('Error fetching projects:', error)
	}
}

async function getUnmergedGitlabMergeRequests(projectId) {
	const gitlabToken = JSON.parse(localStorage.getItem('gitlabToken')).token
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects/${projectId}/merge_requests?state=opened`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching merge requests: ${response.statusText}`
			)
		}

		const mergeRequests = await response.json()
		return mergeRequests
	} catch (error) {
		console.error('Error fetching unmerged merge requests:', error)
		return []
	}
}

async function getGitlabMRsFromAllProjects() {
	const projects = JSON.parse(localStorage.getItem('gitProjects'))
	if (!projects) return []

	const mergeRequests = await Promise.all(
		projects.map(async (project) => {
			const mrs = await getUnmergedGitlabMergeRequests(project.id)
			// Add project namespace to each merge request
			return mrs.map((mr) => ({
				...mr,
				project_namespace: project.path_with_namespace || 'Unknown',
				project_url: project.web_url
			}))
		})
	)
	console.log('Gitlab Merge Requests:', mergeRequests.flat())
	return mergeRequests.flat()
}

async function getGitlabMRbyId(mergeRequestId, projectId) {
	const gitlabToken = JSON.parse(localStorage.getItem('gitlabToken')).token
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects/${projectId}/merge_requests/${mergeRequestId}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching merge request: ${response.statusText}`
			)
		}

		const mergeRequest = await response.json()
		return mergeRequest
	} catch (error) {
		console.error('Error fetching merge request:', error)
		return {}
	}
}

async function getTransformedGitlabMRs() {
	const mergeRequests = await getGitlabMRsFromAllProjects()

	const transformedMRs = mergeRequests.map((mr) => ({
		id: mr.id,
		title: mr.title,
		status: mr.detailed_merge_status,
		url: mr.web_url,
		author: mr.author?.name || 'Unknown',
		dateModified: mr.updated_at,
		isDraft: mr.work_in_progress,
		project: mr.project_namespace,
		projectUrl: mr.project_url,
		projectId: mr.project_id,
		iid: mr.iid || '',
		color: 'orange',
		jiraId: mr.title.match(/\[(\w+-\d+)\]/)?.[1],
		rowClick: async () => {
			const mrdet = await getGitlabMRbyId(mr.iid, mr.project_id)
			console.log('Merge Request:', mrdet)
		}
	}))

	console.log('Transformed Merge Requests:', transformedMRs)
	return transformedMRs
}

export {
	isGitlabTokenValid,
	gitlabConnect,
	gitlabCallback,
	getMyGitlabUser,
	getGitlabProjects,
	getProjectsByIds,
	getGitlabMRbyId,
	getTransformedGitlabMRs
}
