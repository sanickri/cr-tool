import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	AppBar,
	Box,
	Button,
	Container,
	IconButton,
	Menu,
	MenuItem,
	Toolbar,
	Typography,
	Avatar,
	Tooltip
} from '@mui/material'
import { Logout, Login, Replay } from '@mui/icons-material'
import MenuIcon from '@mui/icons-material/Menu'

// TERROR = Tool for Engineering Review Realisation and ORganization
const TopMenu = ({
	setHasGitProjects,
	setIsGitConnected,
	setIsPhabConnected,
	setProjectIds,
	setRevisions,
	isGitConnected,
	isPhabConnected,
	setGitlabDialogOpen,
	setPhabricatorDialogOpen,
	hasGitProjects,
	setFetchDialogOpen
}) => {
	const navigate = useNavigate()
	const [anchorElNav, setAnchorElNav] = useState(null)
	const [anchorElUser, setAnchorElUser] = useState(null)

	const gitlabUserData = localStorage.getItem('gitlabUser')
	const avatarUrl = gitlabUserData
		? JSON.parse(gitlabUserData)?.avatar_url || ''
		: ''

	const handleOpenNavMenu = (event) => {
		setAnchorElNav(event.currentTarget)
	}
	const handleOpenUserMenu = (event) => {
		setAnchorElUser(event.currentTarget)
	}

	const handleCloseNavMenu = () => {
		setAnchorElNav(null)
	}

	const handleCloseUserMenu = () => {
		setAnchorElUser(null)
	}

	const handleGitConnect = () => {
		setGitlabDialogOpen(true)
	}

	const handlePhabConnect = () => {
		setPhabricatorDialogOpen(true)
	}

	const handleOpenFetchDialog = () => {
		setFetchDialogOpen(true)
	}

	const handleDisconnect = () => {
		localStorage.clear()
		setIsGitConnected(false)
		setIsPhabConnected(false)
		// TODO: Update the starting state if you're adding more data sources
		setRevisions([[], []])
		setHasGitProjects([])
		setProjectIds('')
		handleCloseUserMenu()
	}

	const handleGitDisconnect = () => {
		localStorage.removeItem('gitlabUser')
		localStorage.removeItem('gitProjects')
		localStorage.removeItem('gitlabUrl')
		localStorage.removeItem('gitlabToken')
		setIsGitConnected(false)
		setRevisions((prevRevisions) => {
			const updatedRevisions = [...prevRevisions]
			updatedRevisions[0] = []
			return updatedRevisions
		})
		setHasGitProjects(false)
		setProjectIds('')
		handleCloseUserMenu()
	}

	const handlePhabDisconnect = () => {
		localStorage.removeItem('phabricatorUrl')
		localStorage.removeItem('phabricatorToken')
		localStorage.removeItem('phabUser')
		setIsPhabConnected(false)
		setRevisions((prevRevisions) => {
			const updatedRevisions = [...prevRevisions]
			updatedRevisions[1] = []
			return updatedRevisions
		})
		handleCloseUserMenu()
	}

	return (
		<AppBar position="static" data-testid="top-menu">
			<Container maxWidth={false}>
				<Toolbar disableGutters>
					<Typography
						variant="h6"
						noWrap
						component="a"
						onClick={() => navigate('/')}
						sx={{
							mr: 2,
							display: { xs: 'none', md: 'flex' },
							fontFamily: 'monospace',
							fontWeight: 700,
							letterSpacing: '.3rem',
							color: 'inherit',
							textDecoration: 'none',
							cursor: 'pointer'
						}}
						role="button"
						aria-label="Go to home page"
						data-testid="app-title-desktop"
					>
						TERROR
					</Typography>

					{/* Connection Status Spans for Testing */}
					<span
						data-testid="gitlab-connection-status"
						style={{ display: 'none' }}
					>
						{isGitConnected ? 'Connected' : 'Not Connected'}
					</span>
					<span
						data-testid="phabricator-connection-status"
						style={{ display: 'none' }}
					>
						{isPhabConnected ? 'Connected' : 'Not Connected'}
					</span>

					<Box
						sx={{
							flexGrow: 1,
							display: { xs: 'flex', md: 'none' }
						}}
					>
						<IconButton
							size="large"
							aria-label="open navigation menu"
							aria-controls="menu-appbar"
							aria-haspopup="true"
							onClick={handleOpenNavMenu}
							color="inherit"
							data-testid="menu-icon"
						>
							<MenuIcon />
						</IconButton>
						<Menu
							id="menu-appbar"
							anchorEl={anchorElNav}
							anchorOrigin={{
								vertical: 'bottom',
								horizontal: 'left'
							}}
							keepMounted
							transformOrigin={{
								vertical: 'top',
								horizontal: 'left'
							}}
							open={Boolean(anchorElNav)}
							onClose={handleCloseNavMenu}
							sx={{ display: { xs: 'block', md: 'none' } }}
							role="menu"
							data-testid="menu-appbar"
						>
							{/* <MenuItem
								onClick={() => {
									navigate('/detail')
								}}
								role="menuitem"
							>
								<Typography sx={{ textAlign: 'center' }}>
									Detail
								</Typography>
							</MenuItem> */}
						</Menu>
					</Box>
					<Typography
						variant="h5"
						noWrap
						component="a"
						onClick={() => navigate('/')}
						sx={{
							mr: 2,
							display: { xs: 'flex', md: 'none' },
							flexGrow: 1,
							fontFamily: 'monospace',
							fontWeight: 700,
							letterSpacing: '.3rem',
							color: 'inherit',
							textDecoration: 'none',
							cursor: 'pointer'
						}}
						role="button"
						aria-label="Go to home page"
						data-testid="app-title-mobile"
					>
						TERROR
					</Typography>
					<Box
						sx={{
							flexGrow: 1,
							display: { xs: 'none', md: 'flex' }
						}}
					>
						{/* <Button
							onClick={() => navigate('/detail')}
							sx={{ my: 2, color: 'white', display: 'block' }}
						>
							Detail
						</Button> */}
					</Box>
					<Box sx={{ flexGrow: 0 }}>
						<Tooltip title="Open settings">
							<IconButton
								onClick={handleOpenUserMenu}
								sx={{ p: 0 }}
								aria-label="open settings"
								aria-controls="user-menu"
								aria-haspopup="true"
								role="button"
							>
								<Avatar
									alt="User Avatar"
									src={avatarUrl}
									role="img"
								/>
							</IconButton>
						</Tooltip>
						<Menu
							sx={{ mt: '45px' }}
							id="user-menu"
							anchorEl={anchorElUser}
							anchorOrigin={{
								vertical: 'top',
								horizontal: 'right'
							}}
							keepMounted
							transformOrigin={{
								vertical: 'top',
								horizontal: 'right'
							}}
							open={Boolean(anchorElUser)}
							onClose={handleCloseUserMenu}
							role="menu"
							data-testid="user-menu"
						>
							<MenuItem
								onClick={() => {
									navigate('/account')
								}}
								role="menuitem"
							>
								Account
							</MenuItem>
							<MenuItem
								onClick={handleGitConnect}
								sx={{
									display: isGitConnected ? 'none' : 'block'
								}}
								role="menuitem"
								data-testid="gitlab-menu-item"
							>
								<Login /> Gitlab
							</MenuItem>
							<MenuItem
								onClick={handlePhabConnect}
								sx={{
									display: isPhabConnected ? 'none' : 'block'
								}}
								role="menuitem"
								data-testid="phabricator-menu-item"
							>
								<Login /> Phabricator
							</MenuItem>
							<MenuItem
								onClick={handleOpenFetchDialog}
								sx={{
									display: isGitConnected ? 'block' : 'none'
								}}
								role="menuitem"
								data-testid="fetch-projects-menu-item"
							>
								<Replay /> Git Projects
							</MenuItem>

							<MenuItem
								onClick={handleGitDisconnect}
								sx={{
									display: isGitConnected ? 'block' : 'none'
								}}
								role="menuitem"
							>
								<Logout /> Gitlab
							</MenuItem>
							<MenuItem
								onClick={handlePhabDisconnect}
								sx={{
									display: isPhabConnected ? 'block' : 'none'
								}}
								role="menuitem"
							>
								<Logout /> Phabricator
							</MenuItem>
							<MenuItem
								onClick={handleDisconnect}
								sx={{
									display:
										isPhabConnected && isGitConnected
											? 'block'
											: 'none'
								}}
								role="menuitem"
							>
								<Logout /> All
							</MenuItem>
						</Menu>
					</Box>
				</Toolbar>
			</Container>
		</AppBar>
	)
}

export default TopMenu
