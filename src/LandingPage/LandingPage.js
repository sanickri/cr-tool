import { useState, useEffect } from 'react'
import ConnectionStatus from './ConnectionStatus'
import Revisions from '../Revisions/Revisions'
import { handleGitlabCallback } from '../utils/auth'

const LandingPage = () => {
	const [gitlabDialogOpen, setGitlabDialogOpen] = useState(false)
	const [phabricatorDialogOpen, setPhabricatorDialogOpen] = useState(false)
	const [gitlabUrl, setGitlabUrl] = useState('')
	const [phabricatorToken, setPhabricatorToken] = useState('')
	const [phabricatorUrl, setPhabricatorUrl] = useState('')
	const [isGitConnected, setIsGitConnected] = useState(false)
	const [isPhabConnected, setIsPhabConnected] = useState(false)
	const [revisions, setRevisions] = useState([])
	const [allPhabUsers, setAllPhabUsers] = useState([])
	useEffect(() => {
		handleGitlabCallback(setIsGitConnected, setRevisions)
	}, [])
	return (
		<>
			<ConnectionStatus
				isGitConnected={isGitConnected}
				setIsGitConnected={setIsGitConnected}
				isPhabConnected={isPhabConnected}
				setIsPhabConnected={setIsPhabConnected}
				setGitlabDialogOpen={setGitlabDialogOpen}
				setPhabricatorDialogOpen={setPhabricatorDialogOpen}
				gitlabDialogOpen={gitlabDialogOpen}
				phabricatorDialogOpen={phabricatorDialogOpen}
				gitlabUrl={gitlabUrl}
				setGitlabUrl={setGitlabUrl}
				phabricatorUrl={phabricatorUrl}
				setPhabricatorUrl={setPhabricatorUrl}
				phabricatorToken={phabricatorToken}
				setPhabricatorToken={setPhabricatorToken}
				setRevisions={setRevisions}
				setAllPhabUsers={setAllPhabUsers}
			/>
			{(isPhabConnected || isGitConnected) && (
				<Revisions revisions={revisions} allPhabUsers={allPhabUsers} />
			)}
		</>
	)
}

export default LandingPage
