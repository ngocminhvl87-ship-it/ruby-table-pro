import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create Admin user
    const { data: adminUser, error: adminError } = await adminClient.auth.admin.createUser({
      email: "admin@coffeeruby.com",
      password: "Gialoank8@$26",
      email_confirm: true,
      user_metadata: { username: "Admincoffeeruby", full_name: "Admin Ruby" },
    });

    if (adminError && !adminError.message.includes("already")) {
      console.error("Admin create error:", adminError);
    }

    if (adminUser?.user) {
      await adminClient.from("user_roles").upsert({ user_id: adminUser.user.id, role: "admin" }, { onConflict: "user_id,role" });
    }

    // Create Staff user
    const { data: staffUser, error: staffError } = await adminClient.auth.admin.createUser({
      email: "staff01@coffeeruby.com",
      password: "Rubystaff1@26",
      email_confirm: true,
      user_metadata: { username: "Nhanvien01", full_name: "Nhân Viên 01" },
    });

    if (staffError && !staffError.message.includes("already")) {
      console.error("Staff create error:", staffError);
    }

    if (staffUser?.user) {
      await adminClient.from("user_roles").upsert({ user_id: staffUser.user.id, role: "staff" }, { onConflict: "user_id,role" });
    }

    // Seed 20 tables
    const tables = Array.from({ length: 20 }, (_, i) => ({ table_number: i + 1, status: "available" }));
    await adminClient.from("tables").upsert(tables, { onConflict: "table_number" });

    // Seed categories and menu items
    const menuData: Record<string, { name: string; price: number }[]> = {
      "HOT TREND": [
        { name: "Cafe Muối", price: 30000 },
        { name: "Cafe Sữa Muối", price: 35000 },
        { name: "Ca Cao Kem Sữa", price: 35000 },
        { name: "Matcha Kem Muối", price: 35000 },
        { name: "Sữa Chua Cacao", price: 30000 },
      ],
      "TRÀ LIPTON": [
        { name: "Trà Lipton Chanh (Đá/Nóng)", price: 17000 },
        { name: "Trà Lipton Mật Ong (Đá/Nóng)", price: 25000 },
        { name: "Trà Lipton Sữa (Đá/Nóng)", price: 22000 },
        { name: "Lipton Cam", price: 22000 },
        { name: "Lipton Café", price: 22000 },
        { name: "Lipton Xí Muội", price: 22000 },
      ],
      "YOGURT TRÁI CÂY": [
        { name: "Việt Quất", price: 35000 },
        { name: "Dâu", price: 35000 },
        { name: "Chanh Dây", price: 35000 },
        { name: "Kiwi", price: 35000 },
        { name: "Đào", price: 35000 },
      ],
      "ĐỒ UỐNG KHÁC": [
        { name: "Đá Chanh (Đá/Nóng)", price: 15000 },
        { name: "Chanh Tươi Mật Ong (Đá/Nóng)", price: 25000 },
        { name: "Tắc Xí Muội", price: 15000 },
        { name: "Đá Me", price: 15000 },
        { name: "Rau Má", price: 15000 },
        { name: "Rau Má Sữa", price: 20000 },
        { name: "Rau Má Dừa", price: 25000 },
        { name: "Dừa Trái", price: 20000 },
        { name: "Dừa Tắc", price: 20000 },
        { name: "Bạc Hà Sữa", price: 20000 },
      ],
      "NƯỚC GIẢI KHÁT": [
        { name: "Sting", price: 18000 },
        { name: "Coca Cola", price: 18000 },
        { name: "Trà Xanh 0 Độ", price: 18000 },
        { name: "7 Up", price: 18000 },
        { name: "Ô Long", price: 18000 },
        { name: "247", price: 18000 },
        { name: "Number One", price: 18000 },
        { name: "Nước Suối Lavie", price: 12000 },
        { name: "Red Bull", price: 22000 },
      ],
      "CÀ PHÊ – SỮA": [
        { name: "Cà Phê Phin (Đá/Nóng)", price: 20000 },
        { name: "Cà Phê Máy (Đá/Nóng)", price: 20000 },
        { name: "Cà Phê Sữa (Đá/Nóng)", price: 25000 },
        { name: "Bạc Xỉu (Đá/Nóng)", price: 25000 },
        { name: "Sữa Tươi Cà Phê", price: 25000 },
        { name: "Cà Phê Socola", price: 25000 },
        { name: "Cà Phê Caramel", price: 25000 },
        { name: "Cà Phê Cốt Dừa", price: 25000 },
        { name: "Sữa Chua Đá", price: 20000 },
        { name: "Sữa Chua Café", price: 25000 },
      ],
      "CACAO": [
        { name: "Ca Cao (Đá/Nóng)", price: 20000 },
        { name: "Ca Cao Sữa (Đá/Nóng)", price: 25000 },
      ],
      "ĐÁ XAY": [
        { name: "Chanh Tuyết", price: 30000 },
        { name: "Cà Phê Đá Xay", price: 35000 },
        { name: "Caramel Đá Xay", price: 35000 },
        { name: "Chocola Đá Xay", price: 35000 },
        { name: "Matcha Đá Xay", price: 35000 },
        { name: "Cà Phê Cốt Dừa Đá Xay", price: 35000 },
      ],
      "TRÀ TRÁI CÂY TRÂN CHÂU": [
        { name: "Trà Đào", price: 35000 },
        { name: "Trà Vải", price: 35000 },
        { name: "Sữa Chua Cà Phê", price: 35000 },
        { name: "Trà Dâu", price: 35000 },
        { name: "Trà Chanh Dây", price: 35000 },
      ],
      "SINH TỐ": [
        { name: "Sinh Tố Dâu", price: 35000 },
        { name: "Sinh Tố Kiwi", price: 35000 },
        { name: "Sinh Tố Chanh Dây", price: 35000 },
        { name: "Sinh Tố Việt Quất", price: 35000 },
      ],
      "NƯỚC ÉP": [
        { name: "Cam", price: 25000 },
        { name: "Ổi", price: 25000 },
        { name: "Thơm", price: 25000 },
        { name: "Dưa Hấu", price: 25000 },
        { name: "Cam Chanh Dây", price: 25000 },
      ],
      "SODA": [
        { name: "Soda Blue (Biển Xanh)", price: 35000 },
        { name: "Soda Blue Berry (Dâu)", price: 35000 },
        { name: "Soda Mint (Bạc Hà)", price: 35000 },
        { name: "Soda Chanh Dây", price: 35000 },
        { name: "Soda Kiwi", price: 35000 },
        { name: "Soda Việt Quất", price: 35000 },
        { name: "Soda Dâu", price: 35000 },
        { name: "Soda Đào", price: 35000 },
        { name: "Soda Táo", price: 35000 },
        { name: "Soda Chanh", price: 20000 },
      ],
    };

    let order = 0;
    for (const [categoryName, items] of Object.entries(menuData)) {
      const { data: cat } = await adminClient
        .from("categories")
        .upsert({ name: categoryName, display_order: order++ }, { onConflict: "name" })
        .select()
        .single();

      // Need to handle upsert - categories don't have unique on name yet, use insert
      let catId = cat?.id;
      if (!catId) {
        const { data: existing } = await adminClient
          .from("categories")
          .select("id")
          .eq("name", categoryName)
          .single();
        catId = existing?.id;
        if (!catId) {
          const { data: inserted } = await adminClient
            .from("categories")
            .insert({ name: categoryName, display_order: order - 1 })
            .select()
            .single();
          catId = inserted?.id;
        }
      }

      if (catId) {
        for (const item of items) {
          await adminClient.from("menu_items").insert({
            category_id: catId,
            name: item.name,
            price: item.price,
            is_available: true,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Seed completed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
