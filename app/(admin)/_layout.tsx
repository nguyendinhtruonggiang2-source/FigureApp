// app/(admin)/_layout.tsx
import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="add-products" 
        options={{
          title: "Thêm sản phẩm",
          headerShown: true,
        }}
      />
    </Stack>
  );
}