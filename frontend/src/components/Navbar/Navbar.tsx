import pyramidGif from "@assets/pyramid-transparent.gif";
import alphaLogo from "@assets/alpha-view-logo.png";
import { Group, Button, ActionIcon } from "@mantine/core";
import { Link } from "react-router-dom";
import { ReactNode } from "react";
import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";

function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();

  return (
    <ActionIcon
      onClick={() =>
        setColorScheme(computedColorScheme === "dark" ? "light" : "dark")
      }
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
    >
      {computedColorScheme === "dark" ? (
        <IconSun size={18} />
      ) : (
        <IconMoon size={18} />
      )}
    </ActionIcon>
  );
}

function Navbar({ children }: { children: ReactNode }) {
  return (
    <Group justify="center" align="center" w="100%" h={100}>
      <Group justify="center" align="center" flex={1} miw="30%">
        <img
          src={pyramidGif}
          alt="Logo icon, picture of spinning pyramid"
          width="100"
          height="100"
        />
        <img src={alphaLogo} alt="AlphaView Logo" width="300" height="40" />
        {children}
      </Group>
      <Group mr={5} align="center">
        <Button
          component={Link}
          to="/login"
          variant="outline"
          color="custom"
          styles={{
            root: {
              borderColor: "var(--color-highlighted)",
              color: "var(--color-text-primary)",
            },
          }}
        >
          Login | Create Account
        </Button>
        <ThemeToggle />
      </Group>
    </Group>
  );
}

export default Navbar;
