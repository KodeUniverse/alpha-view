import pyramidGif from "@assets/pyramid.gif";
import alphaLogo from "@assets/alpha-view-logo.png";
import {
  Autocomplete,
  TextField,
  Box,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function Navbar(props) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          minWidth: "30%",
        }}
      >
        <img
          src={pyramidGif}
          alt="Logo icon, picture of spinning pyramid"
          width="100"
          height="100"
        />
        <img src={alphaLogo} alt="AlphaView Logo" width="300" height="40" />
        {props.children}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", marginRight: 5 }}>
        <Button
          component={Link}
          to="/login"
          sx={{
            border: "1px solid",
            borderColor: "var(--color-highlighted)",
            color: "var(--color-text-primary)",
          }}
        >
          Login | Create Account
        </Button>
      </Box>
    </Box>
  );
}

export default Navbar;
