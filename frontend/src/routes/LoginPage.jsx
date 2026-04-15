import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  TextField,
  Divider,
} from "@mui/material";

import alphaPyramid from "@assets/pyramid-transparent.gif";
import alphaLogo from "@assets/alpha-view-logo.png";
import { Link } from "react-router-dom";

function LoginPage() {
  return (
    <>
      <Button component={Link} to="/">
        Back
      </Button>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Card sx={{ width: "25%", height: "50%" }}>
          <CardContent overflow="auto">
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Box sx={{ display: "flex" }}></Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <img src={alphaPyramid} width="120" height="120" />
                  <img src={alphaLogo} width="100%" height="50" />
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                alignItems: "center",
              }}
            >
              <TextField
                label="Username"
                variant="filled"
                sx={{
                  width: "70%",
                  backgroundColor: "var(--color-background-tertiary)",
                }}
              />
              <TextField
                label="Password"
                variant="filled"
                sx={{
                  width: "70%",
                  backgroundColor: "var(--color-background-tertiary)",
                }}
              />
              <Button
                sx={{
                  width: "70%",
                  backgroundColor: "var(--color-highlighted)",
                }}
                variant="contained"
              >
                Login
              </Button>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 5,
                  paddingBottom: 1,
                  paddingLeft: 5,
                  paddingRight: 5,
                  gap: 2,
                }}
              >
                <Divider
                  sx={{
                    width: "50%",
                    backgroundColor: "var(--color-text-primary)",
                    flex: 1,
                    minWidth: 0,
                  }}
                />
                <Typography>or continue with</Typography>
                <Divider
                  sx={{
                    width: "50%",
                    backgroundColor: "var(--color-text-primary)",
                    flex: 1,
                    minWidth: 0,
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Button>Google</Button>
                <Button>Facebook</Button>
                <Button>GitHub</Button>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Typography>Don't have an account?</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}

export default LoginPage;
