import qs from 'qs'
import dotenv from 'dotenv'
import { parse } from 'path-browserify'
dotenv.config()

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

	// To find PHID: curl -X POST -d api.token=your_api_token https://<your_phabricator_instance>/api/user.whoami
	async getUserInfo(userPHID) {
		const result = await this.callAPI('user.search', {
			constraints: {
				phids: [userPHID]
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

	async getRevisionInfo(revisionId) {
		const result = await this.callAPI('differential.revision.search', {
			constraints: {
				ids: [revisionId]
			}
		})
		return result.data
	}

	async getDiffInfo(diffId) {
		const result = await this.callAPI('differential.diff.search', {
			constraints: {
				ids: [diffId]
			},
			attachments: {
				reviewers: true
			}
		})
		return result.data
	}

	async getPhabricatorRepositoryInfo(phid) {
		const result = await this.callAPI('diffusion.repository.search', {
			constraints: {
				phids: [phid]
			}
		})
		return result.data
	}

	async getTransformedRevisions() {
		const revisions = await this.getRevisions()
		const transformedRevisions = await Promise.all(
			revisions.map(async (revision) => {
				const author = await this.getUserInfo(
					revision.fields.authorPHID
				)
				const project = await this.getPhabricatorRepositoryInfo(
					revision.repositoryPHID
				)
				// retrieve Jira id from revision title eg. [JIRA-123] Title and not [nojira]
				const jiraId = revision.fields.title.match(/\[(\w+-\d+)\]/)
				return {
					id: revision.id,
					title: revision.fields.title,
					status: revision.fields.status.value,
					url: `${this.config.phabricatorUrl}/D${revision.id}`,
					author: author[0].fields.realName,
					dateModified: revision.fields.dateModified * 1000,
					isDraft: revision.fields.isDraft,
					project: project[0].fields.name,
					projectUrl: `${this.config.phabricatorUrl}/diffusion/${project[0].id}`,
					projectId: project[0].id,
					jiraId: jiraId ? jiraId[1] : '',
					color:
						revision.fields.status.value === 'accepted'
							? 'phab-green'
							: 'blue',
					source: 'P'
				}
			})
		)
		return transformedRevisions
	}

	async getDiffChanges(diffID) {
		console.log('Diff PHID:', diffID)
		const result = await this.callAPI('differential.diff.search', {
			constraints: {
				revisionPHIDs: [diffID]
			},
			attachments: {
				commits: true
			}
		})
		return result.data
	}

	async getRawDiff(diffId) {
		const result = await this.callAPI('differential.getrawdiff', {
			diffID: diffId
		})
		return result
	}

	async getRevisionComments(revisionId) {
		const result = await this.callAPI('differential.getrevisioncomments', {
			ids: [revisionId]
		})
		return result
	}

	async getRevisionCommits(revisionId) {
		const result = await this.callAPI('diffusion.commit.search', {
			constraints: {
				phids: [revisionId]
			}
		})
		return result.data
	}

	async getRevisionDetailsWithReviewers(revisionId) {
		const result = await this.callAPI('differential.query', {
			ids: [revisionId]
		})
		return result
	}

	processComments(commentsArray) {
		if (!commentsArray) {
			return []
		}
		return commentsArray
			.filter(
				(comment) =>
					comment.content !== null &&
					comment.content !== undefined &&
					(comment.action === 'comment' ||
						comment.content.trim().length > 0)
			)
			.sort((a, b) => a.dateCreated - b.dateCreated)
			.map((comment) => ({
				id: `${comment.revisionID}-${comment.dateCreated}`,
				author: {
					username: comment.username,
					authorPHID: comment.authorPHID,
					name: comment.authorName
				},
				body: comment.content,
				created_at: parseInt(comment.dateCreated) * 1000,
				action: comment.action
			}))
	}

	parseMultipleDiffs(diffText) {
		const diffs = []
		const diffLines = diffText.split('\n')
		let currentDiff = null
		let currentChanges = []

		for (let i = 0; i < diffLines.length; i++) {
			const line = diffLines[i] // Start of a new diff

			if (line.startsWith('diff --git')) {
				// Save previous diff if exists
				if (currentDiff) {
					currentDiff.diff = currentChanges.join('\n')
					diffs.push(currentDiff)
				} // Initialize new diff

				currentDiff = {
					old_name: null,
					new_name: null,
					diff: null
				}
				currentChanges = [] // Parse file paths

				const pathMatch = line.match(/diff --git a\/(.*) b\/(.*)/)
				if (pathMatch) {
					currentDiff.old_name = pathMatch[1]
					currentDiff.new_name = pathMatch[2]
				}
			} // Collect changes
			else if (currentDiff) {
				currentChanges.push(line)
			}
		} // Save the last diff

		if (currentDiff) {
			currentDiff.diff = currentChanges.join('\n')
			diffs.push(currentDiff)
		}

		return diffs
	}

	async getTransformedRevisionInfo(revisionId) {
		const revision = await this.getRevisionDetailsWithReviewers(revisionId)
		console.log('Revision:', revision)
		const author = await this.getUserInfo(revision[0].authorPHID)
		const project = await this.getPhabricatorRepositoryInfo(
			revision[0].repositoryPHID
		)
		console.log('Project:', project)
		const jiraId = revision[0].title.match(/\[(\w+-\d+)\]/)
		const diffsInfo = await this.getDiffInfo(revisionId)
		console.log('Diff:', diffsInfo)
		let diffs = []
		diffs = await this.getRawDiff(diffsInfo[0].id)

		console.log('diffs:', diffs)
		const parsedDiffs = this.parseMultipleDiffs(diffs)
		console.log('Parsed Diffs:', parsedDiffs)

		const commentsData = await this.getRevisionComments(revisionId)
		const comments = this.processComments(Object.values(commentsData)[0])

		// Map authorPHID to realName
		await Promise.all(
			comments.map(async (comment) => {
				const author = await this.getUserInfo(comment.author.authorPHID)
				console.log('Author:', author[0])
				comment.author.name = author[0]?.fields.realName || ''
				comment.author.username = author[0]?.fields.username || ''
			})
		)
		console.log('Comments:', comments)
		const changes = await this.getDiffChanges(revision[0].phid)
		console.log('Changes:', changes)
		const commits = changes[0].attachments.commits

		const reviewers = Object.keys(revision[0].reviewers)
		console.log('Reviewers:', reviewers)
		const reviewerDetails = await Promise.all(
			reviewers.map(async (reviewer) => {
				console.log('Reviewer:', reviewer)
				let reviewerInfo = await this.getUserInfo(reviewer)
				console.log('Reviewer Info:', reviewerInfo)
				// skip if reviewer is author or does not have data
				if (reviewer === revision[0].authorPHID || !reviewerInfo[0]) {
					return
				}
				return {
					name: reviewerInfo[0]?.fields.realName,
					username: reviewerInfo[0]?.fields.username
				}
			})
		)
		const newRevision = {
			id: revision[0].id,
			title: revision[0].title,
			summary: revision[0].summary,
			status: revision[0].statusName,
			url: `${this.config.phabricatorUrl}/D${revision[0].id}`,
			author: {
				name: author[0]?.fields.realName,
				username: author[0]?.fields.username
			},
			dateModified: revision[0].dateModified * 1000,
			project: project[0]?.fields.name || 'No project',
			jiraId: jiraId ? jiraId[1] : '',
			branch: revision[0].branch,
			commits: commits.commits,
			reviewers: reviewerDetails,
			comments: comments || [],
			changes: changes || [],
			diffs: parsedDiffs
		}
		console.log('New Revision:', newRevision)
		return newRevision
	}
}

export default PhabricatorAPI
