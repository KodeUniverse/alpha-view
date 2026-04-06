import { Box, Card, CardHeader, CardContent, Typography, Button } from "@mui/material";
import alphaPyramid from "@assets/pyramid.gif"
import { Link } from "react-router-dom";
function LoginPage() {

    return (<>
        <Button component={Link} to="/">Back</Button>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <Card sx={{ width: "30%", height: "60%" }}>
                <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Box sx={{ display: "flex" }}>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <img src={alphaPyramid} width="100" height="100" />
                            <Typography>Login or Register</Typography>
                        </Box>
                    </Box>
                    <Box>input fields</Box>
                </CardContent>
            </Card>
        </Box>

    </>)
}

export default LoginPage;
