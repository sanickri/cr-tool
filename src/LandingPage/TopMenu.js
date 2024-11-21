import React, { useState } from 'react'
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

const pages = ['Nothing', 'To', 'See', 'Here', 'Yet']

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
	const [anchorElNav, setAnchorElNav] = useState(null)
	const [anchorElUser, setAnchorElUser] = useState(null)

	const avatarUrl =
		JSON.parse(localStorage.getItem('gitlabUser'))?.avatar_url || ''
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
		<AppBar position="static">
			<Container maxWidth="xl">
				<Toolbar disableGutters>
					<Typography
						variant="h6"
						noWrap
						component="a"
						href="#app-bar-with-responsive-menu"
						sx={{
							mr: 2,
							display: { xs: 'none', md: 'flex' },
							fontFamily: 'monospace',
							fontWeight: 700,
							letterSpacing: '.3rem',
							color: 'inherit',
							textDecoration: 'none'
						}}
					>
						SOMECOOLNAMEHERE
					</Typography>

					<Box
						sx={{
							flexGrow: 1,
							display: { xs: 'flex', md: 'none' }
						}}
					>
						<IconButton
							size="large"
							aria-label="account of current user"
							aria-controls="menu-appbar"
							aria-haspopup="true"
							onClick={handleOpenNavMenu}
							color="inherit"
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
						>
							{pages.map((page) => (
								<MenuItem
									key={page}
									onClick={handleCloseNavMenu}
								>
									<Typography sx={{ textAlign: 'center' }}>
										{page}
									</Typography>
								</MenuItem>
							))}
						</Menu>
					</Box>
					<Typography
						variant="h5"
						noWrap
						component="a"
						href="#app-bar-with-responsive-menu"
						sx={{
							mr: 2,
							display: { xs: 'flex', md: 'none' },
							flexGrow: 1,
							fontFamily: 'monospace',
							fontWeight: 700,
							letterSpacing: '.3rem',
							color: 'inherit',
							textDecoration: 'none'
						}}
					>
						SOMECOOLNAMEHERE
					</Typography>
					<Box
						sx={{
							flexGrow: 1,
							display: { xs: 'none', md: 'flex' }
						}}
					>
						{pages.map((page) => (
							<Button
								key={page}
								onClick={handleCloseNavMenu}
								sx={{ my: 2, color: 'white', display: 'block' }}
							>
								{page}
							</Button>
						))}
					</Box>
					<Box sx={{ flexGrow: 0 }}>
						<Tooltip title="Open settings">
							<IconButton
								onClick={handleOpenUserMenu}
								sx={{ p: 0 }}
							>
								<Avatar alt="Semy Sharp" src={avatarUrl} />
							</IconButton>
						</Tooltip>
						<Menu
							sx={{ mt: '45px' }}
							id="menu-appbar"
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
						>
							<MenuItem
								onClick={handleGitConnect}
								sx={{
									display: isGitConnected ? 'none' : 'block'
								}}
							>
								<Login /> Gitlab
							</MenuItem>
							<MenuItem
								onClick={handlePhabConnect}
								sx={{
									display: isPhabConnected ? 'none' : 'block'
								}}
							>
								<Login /> Phabricator
							</MenuItem>
							<MenuItem
								onClick={handleOpenFetchDialog}
								sx={{
									display:
										isGitConnected && hasGitProjects
											? 'block'
											: 'none'
								}}
							>
								<Replay /> Git Projects
							</MenuItem>

							<MenuItem
								onClick={handleGitDisconnect}
								sx={{
									display: isGitConnected ? 'block' : 'none'
								}}
							>
								<Logout /> Gitlab
							</MenuItem>
							<MenuItem
								onClick={handlePhabDisconnect}
								sx={{
									display: isPhabConnected ? 'block' : 'none'
								}}
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
