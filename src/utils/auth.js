import qs from 'qs'
import dotenv from 'dotenv'
dotenv.config()

const gitlabConnect = (gitlabUrl) => {
	const clientId = process.env.REACT_APP_GITLAB_CLIENT_ID
	const redirectUri = process.env.REACT_APP_GITLAB_REDIRECT_URL
	const gitlabAuthUrl = `${gitlabUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=api`

	window.location.href = gitlabAuthUrl
}

const handleGitlabCallback = async (setIsGitConnected, setRevisions) => {
	const urlParams = new URLSearchParams(window.location.search)
	const code = urlParams.get('code')

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
		} catch (error) {
			console.error('Error during GitLab callback:', error)
		}
	}
	await getMyGitlabUser()
	getGitlabMRsFromAllProjects().then((mrs) => {
		setRevisions(mrs)
	})
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
		localStorage.setItem('gitLabToken', data.access_token)
		return data.access_token
	} else {
		throw new Error('Failed to obtain access token')
	}
}

async function getMyGitlabUser() {
	console.log('gitlab token', localStorage.getItem('gitLabToken'))
	const gitLabToken = localStorage.getItem('gitLabToken')
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/user`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitLabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(`Error fetching user: ${response.statusText}`)
		}

		const user = await response.json()
		console.log('GitLab User:', user)
		return user
	} catch (error) {
		console.error('Error fetching user:', error)
		return {}
	}
}

async function getGitLabProjects() {
	const gitLabToken = localStorage.getItem('gitLabToken')
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitLabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(`Error fetching projects: ${response.statusText}`)
		}

		const projects = await response.json()
		console.log('GitLab Projects:', projects)
		return projects
	} catch (error) {
		console.error('Error fetching projects:', error)
		return []
	}
}

async function getUnmergedGitLabMergeRequests(projectId) {
	const gitLabToken = localStorage.getItem('gitLabToken')
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects/${projectId}/merge_requests?state=opened`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitLabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching merge requests: ${response.statusText}`
			)
		}

		const mergeRequests = await response.json()
		console.log('Unmerged GitLab Merge Requests:', mergeRequests)
		return mergeRequests
	} catch (error) {
		console.error('Error fetching unmerged merge requests:', error)
		return []
	}
}

async function getGitlabMRsFromAllProjects() {
	const projects = await getGitLabProjects()
	console.log('projects', projects)
	const mergeRequests = await Promise.all(
		projects.map((project) => getUnmergedGitLabMergeRequests(project.id))
	)
	return mergeRequests.flat()
}

class PhabricatorAPI {
	/**
	 * @param {Object} config - Configuration object
	 */
	constructor(config) {
		this.config = config
	}

	async callAPI(method, query) {
		const response = await fetch(
			`${this.config.phabricatorUrl}/api/${method}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: qs.stringify({
					...query,
					'api.token': this.config.phabricatorToken
				})
			}
		)

		const data = await response.json()

		if (data.error_code) {
			throw new Error(
				`Phabricator Error ${data.error_code}: ${data.error_info}`
			)
		}

		return data.result
	}

	// To find PHID: curl -X POST -d api.token=your_api_token https://phabricator.ccl/api/user.whoami
	async getUserInfo(userPHID) {
		console.log('User PHID:', userPHID)
		const result = await this.callAPI('user.search', {
			constraints: {
				phids: userPHID
			}
		})
		return result.data
	}

	async getRevisions() {
		const result = await this.callAPI('differential.revision.search', {
			constraints: {
				statuses: ['needs-review', 'needs-revision', 'accepted']
			}
		})
		return result.data
	}
}

export {
	gitlabConnect,
	handleGitlabCallback,
	getMyGitlabUser,
	getGitLabProjects,
	getGitlabMRsFromAllProjects,
	PhabricatorAPI
}
