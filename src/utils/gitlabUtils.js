import dayjs from 'dayjs'
import dotenv from 'dotenv'
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

const safeJSONParse = (key, defaultValue = null) => {
	try {
		const item = localStorage.getItem(key)
		return item ? JSON.parse(item) : defaultValue
	} catch (error) {
		console.error(`Error parsing ${key} from localStorage:`, error)
		return defaultValue
	}
}

const getGitlabToken = () => {
	const token = safeJSONParse('gitlabToken')
	if (!token || !token.token) {
		throw new Error('GitLab token not found or invalid')
	}
	return token.token
}

const isGitlabTokenValid = () => {
	const storedToken = localStorage.getItem('gitlabToken')
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	if (!storedToken || !gitlabUrl) {
		return false
	}

	try {
		const gitlabToken = JSON.parse(storedToken)

		// Add checks for token structure and expires field
		if (
			!gitlabToken ||
			typeof gitlabToken !== 'object' ||
			!gitlabToken.expires
		) {
			console.error(
				'Invalid GitLab token structure or missing expires field.'
			)
			return false
		}

		const today = dayjs()
		const expires = dayjs(gitlabToken.expires)

		// Add check for valid date parsing
		if (!expires.isValid()) {
			console.error('Invalid expires date format in GitLab token.')
			return false
		}

		return expires.isAfter(today)
	} catch (error) {
		// Catch JSON parsing errors specifically
		console.error('Error parsing GitLab token from localStorage:', error)
		return false
	}
}

const gitlabConnect = (gitlabUrl, gitlabAppId, gitlabRedirectUri) => {
	console.log(
		'Gitlab URL:',
		gitlabUrl,
		'App ID:',
		gitlabAppId,
		'Redirect URI:',
		gitlabRedirectUri
	)
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

const getMyGitlabUser = async () => {
	const gitlabToken = getGitlabToken()
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

const getGitlabProjects = async () => {
	const gitlabToken = getGitlabToken()
	const gitlabUser = safeJSONParse('gitlabUser')
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
	const gitlabToken = getGitlabToken()
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

const getStarredGitlabProjects = async () => {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	try {
		const response = await fetch(
			`${gitlabUrl}/api/v4/projects?starred=true&per_page=100`,
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
				`Error fetching starred projects: ${response.statusText}`
			)
		}

		const projects = await response.json()
		console.log('Starred Projects:', projects)
		return projects
	} catch (error) {
		console.error('Error fetching starred projects:', error)
		return []
	}
}

async function getUnmergedGitlabMergeRequests(projectId) {
	const gitlabToken = getGitlabToken()
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
	const projects = safeJSONParse('gitProjects', [])
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
	const gitlabToken = getGitlabToken()
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

async function getMRComments(projectId, mergeRequestId) {
	const gitlabToken = getGitlabToken()
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects/${projectId}/merge_requests/${mergeRequestId}/notes`,
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
				`Error fetching merge request comments: ${response.statusText}`
			)
		}

		const comments = await response.json()
		return comments
	} catch (error) {
		console.error('Error fetching merge request comments:', error)
		return []
	}
}

async function getTransformedGitlabMRs() {
	const mergeRequests = await getGitlabMRsFromAllProjects()
	const followedUsers = safeJSONParse('followedUsers', [])

	const transformedMRs = mergeRequests.map((mr) => ({
		id: mr.iid,
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
		color:
			mr.detailed_merge_status === 'mergeable' ||
			mr.detailed_merge_status === 'discussions_not_resolved'
				? 'git-green'
				: 'orange',
		jiraId: mr.title.match(/\[(\w+-\d+)\]/)?.[1],
		following: followedUsers.some((user) => user.id === mr.author.id),
		rowClick: async () => {
			const mrdet = await getGitlabMRbyId(mr.iid, mr.project_id)
			console.log('Merge Request:', mrdet)
		},
		source: 'G'
	}))

	console.log('Transformed Merge Requests:', transformedMRs)
	return transformedMRs
}

const getFollowedUsers = async () => {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')
	const userId = safeJSONParse('gitlabUser')?.id

	try {
		const response = await fetch(
			`${gitlabUrl}/api/v4/users/${userId}/following`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(`Error fetching users: ${response.statusText}`)
		}

		const users = await response.json()
		localStorage.setItem('followedUsers', JSON.stringify(users))
		console.log('Followed Users:', users)
		return users
	} catch (error) {
		console.error('Error fetching followed users:', error)
		return []
	}
}

const getTransformedMRInfo = async (revision) => {
	console.log('Not transformed revision:', revision)
	const projects = safeJSONParse('gitProjects', [])
	const comments = await getMRComments(revision.project_id, revision.iid)
	comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
	const project = projects.find(
		(project) => project.id === revision.project_id
	)
	const jiraId = revision.title.match(/\[(\w+-\d+)\]/)?.[1]
	const inlineComments = comments.filter(
		(comment) => comment.type === 'DiffNote'
	)
	return {
		id: revision.iid,
		title: revision.title,
		summary: revision.description,
		status: revision.detailed_merge_status,
		url: revision.web_url,
		author: {
			name: revision.author.name,
			username: revision.author.username
		},
		dateModified: revision.updated_at,
		project: project.path_with_namespace,
		projectUrl: project.web_url,
		projectId: project.id,
		jiraId: jiraId || '',
		branch: revision.source_branch,
		reviewers: revision.reviewers,
		comments: comments || [],
		pipeline: revision.pipeline.status,
		inlineComments: inlineComments || []
	}
}

async function getMRDiff(projectId, mergeRequestIid) {
	const gitlabToken = JSON.parse(localStorage.getItem('gitlabToken')).token
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	try {
		// Fetch the diff for the merge request
		const response = await fetch(
			`${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mergeRequestIid}/changes`,
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
				`Error fetching merge request diff: ${response.statusText}`
			)
		}

		// Parse the response JSON
		const data = await response.json()

		// Extract the changes (diffs) for each file
		const changes = data.changes || []
		console.log('Changes:', changes)
		const parsedDiffs = changes.map((file) => ({
			oldPath: file.old_path,
			newPath: file.new_path,
			diff: file.diff,
			isNewFile: file.new_file,
			isRenamedFile: file.renamed_file,
			isDeletedFile: file.deleted_file
		}))

		console.log('Parsed Diffs:', parsedDiffs)
		return parsedDiffs
	} catch (error) {
		console.error('Error fetching merge request diff:', error)
		return []
	}
}

export {
	getRoleName,
	isGitlabTokenValid,
	gitlabConnect,
	gitlabCallback,
	getMyGitlabUser,
	getGitlabProjects,
	getProjectsByIds,
	getStarredGitlabProjects,
	getGitlabMRbyId,
	getTransformedGitlabMRs,
	getFollowedUsers,
	getTransformedMRInfo,
	getMRDiff
}
