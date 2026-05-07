import {
  Card,
  TextInput,
  Button,
  Divider,
  Text,
  Stack,
  Group,
} from "@mantine/core";
import alphaPyramid from "@assets/pyramid-transparent.gif";
import alphaLogo from "@assets/alpha-view-logo.png";
import { Link } from "react-router-dom";

function LoginPage({ styles = {} }: { styles?: React.CSSProperties }) {
  return (
    <>
      <Button component={Link} to="/" variant="outline" mb={10}>
        Back
      </Button>
      <Group justify="center" align="center" h="100vh">
        <Card style={styles} padding="lg" radius="md" withBorder>
          <Stack gap="md" align="center">
            <Group justify="center" align="center">
              <img src={alphaPyramid} width="120" height="120" />
              <img src={alphaLogo} width="300" height="50" />
            </Group>
            <Stack gap="md" align="center" w="70%">
              <TextInput
                label="Username"
                variant="filled"
                w="100%"
                styles={{
                  input: {
                    backgroundColor: "var(--color-background-tertiary)",
                  },
                }}
              />
              <TextInput
                label="Password"
                type="password"
                variant="filled"
                w="100%"
                styles={{
                  input: {
                    backgroundColor: "var(--color-background-tertiary)",
                  },
                }}
              />
              <Button
                w="100%"
                color="custom"
                styles={{
                  root: {
                    backgroundColor: "var(--color-highlighted)",
                  },
                }}
              >
                Login
              </Button>
            </Stack>
            <Stack gap="sm">
              <Group align="center" gap="xs">
                <Divider flex={1} color="var(--color-text-primary)" h={1} />
                <Text>or continue with</Text>
                <Divider flex={1} color="var(--color-text-primary)" h={1} />
              </Group>
              <Group justify="center">
                <Button variant="default">Google</Button>
                <Button variant="default">Facebook</Button>
                <Button variant="default">GitHub</Button>
              </Group>
              <Group justify="center">
                <Text>Don't have an account?</Text>
              </Group>
            </Stack>
          </Stack>
        </Card>
      </Group>
    </>
  );
}

export default LoginPage;
