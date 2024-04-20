// material-ui
import { ButtonBase } from '@mui/material'

// project imports
import Logo from '@/ui-component/extended/Logo'

// ==============================|| MAIN LOGO ||============================== //

const LogoSection = () => (
    <ButtonBase disableRipple component='a' href='https://www.neraton.com'>
        <Logo />
    </ButtonBase>
)

export default LogoSection
