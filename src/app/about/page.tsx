import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function AboutPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h4" component="h1">
          About
        </Typography>
        <Typography color="text.secondary">TBA</Typography>
      </Stack>
    </Container>
  );
}
