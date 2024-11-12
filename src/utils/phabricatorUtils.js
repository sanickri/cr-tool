import qs from 'qs'
import dotenv from 'dotenv'
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

	async getPhabricatorRepositoryInfo(phid) {
		const result = await this.callAPI('diffusion.repository.search', {
			constraints: {
				phids: [phid]
			}
		})
		return result.data
	}
}

export default PhabricatorAPI
