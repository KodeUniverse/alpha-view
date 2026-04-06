import pyramidGif from "@assets/pyramid.gif";
import { Autocomplete, TextField, Box, Card, CardContent, Button } from "@mui/material";
import { Link } from "react-router-dom";

function Navbar() {
    return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, minWidth: "30%" }}>
                <img src={pyramidGif} alt="Logo" width="100" height="100" />
                <Autocomplete
                    options={["A", "B"]}
                    renderInput={(params) => <TextField
                        {...params}
                        label="Ticker"
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 5 } }}
                    />}
                />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", marginRight: 5 }}>
                <Button component={Link} to="/login" sx={{
                    border: "1px solid",
                    borderColor: "var(--color-highlighted)",
                    color: "var(--color-text-primary)",
                }}>Login | Create Account</Button>
            </Box>
        </Box>);
}

export default Navbar;
