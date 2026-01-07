import { Stack } from "expo-router";

export default function ProductLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: "Chi tiết sản phẩm",
          headerBackTitle: "Quay lại",
        }}
      />
    </Stack>
  );
}
