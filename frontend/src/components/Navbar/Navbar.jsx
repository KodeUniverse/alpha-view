import pyramidGif from "@assets/pyramid.gif";
import styles from "./Navbar.module.css";
import { Autocomplete, TextField } from "@mui/material";

function Navbar() {
    return (
        <div className={styles.navbar}>
            <img src={pyramidGif} alt="Logo" />
            <Autocomplete
                options={["A", "B"]}
                renderInput={(params) => <TextField
                    {...params}
                    label="Ticker"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 5 } }}
                />}
            />
        </div>
    );
}

export default Navbar;
