import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextField, Button, Container } from '@mui/material'

const RevisionSearch = () => {
	const navigate = useNavigate()
	const [revisionId, setRevisionId] = useState('')

	const handleSearch = () => {
		navigate(`/detail/${revisionId}`, {
			state: { revision: { id: revisionId } }
		})
	}

	return (
		<Container>
			<TextField
				id="outlined-basic"
				label="Revision ID"
				variant="outlined"
				value={revisionId}
				onChange={(e) => setRevisionId(e.target.value)}
			/>
			<Button variant="contained" onClick={handleSearch}>
				Search
			</Button>
		</Container>
	)
}

export default RevisionSearch
