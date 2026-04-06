import { Card, CardContent, CardHeader } from "@mui/material";

function WatchListCard({ cardStyles = {} }) {
    return (
        <Card sx={cardStyles}>
            <CardHeader title="Watchlist" />
            <CardContent sx={{ height: "100%", overflow: "auto" }}></CardContent>
        </Card>
    );
}

export default WatchListCard;
