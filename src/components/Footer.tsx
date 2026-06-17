import MuiLink from "@mui/material/Link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        py: 2,
        px: 3,
        textAlign: "center",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {year} ·{" "}
        <MuiLink
          href="https://github.com/kirilinsky"
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
        >
          github.com/kirilinsky
        </MuiLink>
      </Typography>
    </Box>
  );
}
