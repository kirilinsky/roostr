import Link from "next/link";
import MuiLink from "@mui/material/Link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function Footer({
  aboutLabel,
  supportLabel,
}: {
  aboutLabel: string;
  supportLabel: string;
}) {
  const year = new Date().getFullYear();
  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        py: 2,
        px: 3,
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {year} ·{" "}
        <MuiLink
          component={Link}
          href="/about"
          color="inherit"
        >
          {aboutLabel}
        </MuiLink>
        {" · "}
        <MuiLink component={Link} href="/support" color="inherit">
          {supportLabel}
        </MuiLink>
        {" · "}
        <MuiLink
          href="https://github.com/kirilinsky"
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
        >
          github.com/kirilinsky
        </MuiLink>
      </Typography>
      <LocaleSwitcher />
    </Box>
  );
}
