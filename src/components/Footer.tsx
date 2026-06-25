import Link from "next/link";
import MuiLink from "@mui/material/Link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LocaleSwitcher from "@/components/LocaleSwitcher";

// Inline footer link — muted, brand-color on hover, no permanent underline.
function FootLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const extra = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : { component: Link };
  return (
    <MuiLink
      href={href}
      underline="hover"
      color="text.secondary"
      sx={{
        fontSize: "0.8125rem",
        transition: "color 0.15s",
        "&:hover": { color: "primary.main" },
      }}
      {...extra}
    >
      {children}
    </MuiLink>
  );
}

const Dot = () => (
  <Box
    component="span"
    aria-hidden
    sx={{ color: "text.disabled", fontSize: "0.7rem" }}
  >
    •
  </Box>
);

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
        py: { xs: 2, md: 1.75 },
        px: { xs: 2, md: 3 },
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        alignItems: "center",
        justifyContent: { xs: "center", sm: "space-between" },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        justifyContent="center"
        sx={{ gap: { xs: 0.75, sm: 1.25 } }}
      >
        <Typography
          variant="caption"
          component="span"
          sx={{ color: "text.secondary", fontWeight: 600 }}
        >
          🐓 Roostr © {year}
        </Typography>
        <Dot />
        <FootLink href="/about">{aboutLabel}</FootLink>
        <Dot />
        <FootLink href="/support">{supportLabel}</FootLink>
        <Dot />
        <FootLink href="https://github.com/kirilinsky" external>
          GitHub
        </FootLink>
      </Stack>
      <LocaleSwitcher />
    </Box>
  );
}
