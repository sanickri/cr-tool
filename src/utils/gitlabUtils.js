import dotenv from 'dotenv'
import { on } from 'process'
dotenv.config()

const gitlabConnect = (gitlabUrl) => {
	const clientId = process.env.REACT_APP_GITLAB_CLIENT_ID
	const redirectUri = process.env.REACT_APP_GITLAB_REDIRECT_URL
	const gitlabAuthUrl = `${gitlabUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=api`

	window.location.href = gitlabAuthUrl
}

const gitlabCallback = async (code) => {
	const clientId = process.env.REACT_APP_GITLAB_CLIENT_ID
	const redirectUri = process.env.REACT_APP_GITLAB_REDIRECT_URL
	const clientSecret = process.env.REACT_APP_GITLAB_CLIENT_SECRET

	const response = await fetch(
		`${localStorage.getItem('gitlabUrl')}/oauth/token`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: redirectUri
			})
		}
	)
	const data = await response.json()
	if (data.access_token) {
		localStorage.setItem('gitlabToken', data.access_token)
		console.log('Gitlab Token:', data.access_token)
		return data.access_token
	} else {
		throw new Error('Failed to obtain access token')
	}
}

async function getMyGitlabUser() {
	const gitlabToken = localStorage.getItem('gitlabToken')
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
	const gitlabToken = localStorage.getItem('gitlabToken')
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

const fetchProjectsByIds = async (ids) => {
	const gitlabToken = localStorage.getItem('gitlabToken')
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

async function getUnmergedGitlabMergeRequests(projectId) {
	const gitlabToken = localStorage.getItem('gitlabToken')
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
	return mergeRequests.flat()
}

export {
	gitlabConnect,
	gitlabCallback,
	getMyGitlabUser,
	getGitlabProjects,
	fetchProjectsByIds,
	getGitlabMRsFromAllProjects
}
