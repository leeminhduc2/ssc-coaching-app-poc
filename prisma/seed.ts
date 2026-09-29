import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import {
  encrypt,
  LIBRARY,
  VOD,
  COACHING,
  ACADEMY,
} from "../apps/api/src/domain";
const db = new PrismaClient();
async function main() {
  const codes = [LIBRARY, VOD, COACHING, ACADEMY],
    names = [
      "Thư viện bài học",
      "Phân tích VOD cá nhân",
      "Coaching 1-1",
      "Chương trình Academy",
    ];
  for (let i = 0; i < codes.length; i++)
    await db.entitlement.upsert({
      where: { code: codes[i] },
      update: {},
      create: { code: codes[i], name: names[i] },
    });
  const plans = [
    [
      "diamond",
      "Kim Cương",
      199000,
      "#65c7ee",
      "Xây nền tảng, tự tin từng quyết định.",
    ],
    [
      "master",
      "Cao Thủ",
      399000,
      "#bf9cff",
      "Nhìn ra điểm nghẽn qua từng trận đấu.",
    ],
    [
      "grandmaster",
      "Đại Cao Thủ",
      799000,
      "#fb8a91",
      "Bứt phá cùng người hướng dẫn riêng.",
    ],
    [
      "challenger",
      "Thách Đấu",
      1499000,
      "#e6c779",
      "Lộ trình chuyên sâu hướng tới thi đấu.",
    ],
  ] as const;
  for (let i = 0; i < plans.length; i++) {
    const [id, name, amount, color, description] = plans[i];
    await db.plan.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name,
        color,
        description,
        order: i,
        parentId: i ? plans[i - 1][0] : null,
        inviteOnly: i === 3,
        prices: { create: { id: `price-${id}`, amount } },
        entitlements: { create: { code: codes[i] } },
      },
    });
  }
  const pw = hashSync("Demo@12345", 12),
    start = new Date(),
    end = new Date(Date.now() + 30 * 86400000);
  for (const [i, p] of plans.entries()) {
    const id = `demo-${p[0]}`;
    await db.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email: `${p[0]}@ssc.demo`,
        passwordHash: pw,
        displayName: ["Minh Anh", "Minh Anh", "Minh Anh", "Minh Anh"][i],
        riotId: "MinhAnh#DEMO",
        rank: p[1],
        verified: true,
      },
    });
    if (!(await db.subscription.findFirst({ where: { userId: id } })))
      await db.subscription.create({
        data: {
          id: `sub-${p[0]}`,
          userId: id,
          priceId: `price-${p[0]}`,
          start,
          end,
          allocations: {
            create: codes
              .slice(1, i + 1)
              .filter((c) => c !== ACADEMY)
              .map((code) => ({ code, start, end })),
          },
          payments: {
            create: {
              eventId: `seed-${id}`,
              amount: p[2],
              status: "succeeded",
            },
          },
        },
      });
  }
  for (const [id, displayName, specialty, image] of [
    [
      "coach-1",
      "Hải Đăng",
      "Quản lý kinh tế · Linh hoạt đội hình",
      "/assets/coach-1.jpg",
    ],
    [
      "coach-2",
      "Minh Khang",
      "Xếp đội hình · Tư duy giao tranh",
      "/assets/coach-2.jpg",
    ],
  ]) {
    await db.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email: `${id}@ssc.demo`,
        displayName,
        passwordHash: pw,
        role: "coach",
        verified: true,
      },
    });
    await db.coach.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId: id,
        slug: id,
        headline: "Huấn luyện viên Thách Đấu",
        bio: "Cùng bạn hiểu lý do đằng sau từng quyết định. Phương pháp học tập trung vào tư duy, phân tích trận đấu và mục tiêu thực tế. Đây là hồ sơ minh họa cho bản trải nghiệm.",
        image,
        specialty,
        achievements: {
          create: [
            {
              title: "Thách Đấu · 1.200 LP",
              description:
                "Thành tích minh họa, không đại diện người chơi thật.",
            },
            {
              title: "4 mùa đồng hành",
              description: "Hồ sơ coach mẫu của SSC Academy.",
            },
          ],
        },
      },
    });
  }
  await db.user.upsert({
    where: { id: "demo-admin" },
    update: {},
    create: {
      id: "demo-admin",
      email: "admin@ssc.demo",
      displayName: "Quản trị viên",
      passwordHash: pw,
      role: "admin",
      verified: true,
    },
  });
  const titles = [
    "Giữ vàng hay lên cấp? Đọc nhịp độ trận đấu",
    "Xây dựng nền kinh tế vững chắc từ vòng 2",
    "Xếp đội hình: Một ô khác biệt, một trận thắng",
    "Khi nào nên xoay bài? Tư duy chơi linh hoạt",
    "Chọn lõi nâng cấp phù hợp với thế trận",
    "Tối ưu trang bị, phát huy sức mạnh chủ lực",
    "Đọc nhà đối thủ và tìm lợi thế của bạn",
    "Từ chuỗi thua đến màn lội ngược dòng",
    "Kế hoạch lên cấp ở từng giai đoạn",
    "Phân tích trận đấu: Chuyển hóa lợi thế",
    "Những sai lầm thường gặp khi roll",
    "Tư duy top 4: Đánh chắc để tiến xa",
  ];
  const topics = [
    "Kinh tế",
    "Kinh tế",
    "Xếp đội hình",
    "Xoay bài",
    "Lõi nâng cấp",
    "Trang bị",
    "Xếp đội hình",
    "Kinh tế",
    "Kinh tế",
    "Xoay bài",
    "Xoay bài",
    "Tư duy",
  ];
  for (let i = 0; i < titles.length; i++)
    await db.video.upsert({
      where: { id: `video-${i + 1}` },
      update: {},
      create: {
        id: `video-${i + 1}`,
        title: titles[i],
        description:
          "Hiểu nguyên tắc, nhận diện tình huống và tự đưa ra quyết định. Bài học mẫu minh họa phương pháp coaching sau trận; nội dung không phải hướng dẫn meta hiện tại.",
        coachId: i % 2 ? "coach-2" : "coach-1",
        image: `/assets/video-${(i % 6) + 1}.jpg`,
        duration: 1500 + i * 90,
        patch: i < 8 ? "14.23" : "14.24",
        topic: topics[i],
        level: i % 3 ? "Nâng cao" : "Cơ bản",
        visibility: i < 2 ? "public" : "membership",
        type: i === 9 ? "public_review" : "lesson",
      },
    });
  for (const p of plans) {
    const userId = `demo-${p[0]}`;
    await db.progress.upsert({
      where: { userId_videoId: { userId, videoId: "video-1" } },
      update: {},
      create: { userId, videoId: "video-1", position: 630 },
    });
    await db.progress.upsert({
      where: { userId_videoId: { userId, videoId: "video-2" } },
      update: {},
      create: { userId, videoId: "video-2", position: 1590, completed: true },
    });
    await db.favorite.upsert({
      where: { userId_videoId: { userId, videoId: "video-3" } },
      update: {},
      create: { userId, videoId: "video-3" },
    });
    if (p[0] === "diamond") continue;
    const base = await db.subscription.findUniqueOrThrow({
      where: { id: `sub-${p[0]}` },
    });
    const oldStart = new Date(base.start.getTime() - 30 * 86400000),
      oldEnd = new Date(base.start.getTime() - 1000);
    const allocation = await db.allocation.upsert({
      where: { id: `historical-vod-${p[0]}` },
      update: {},
      create: {
        id: `historical-vod-${p[0]}`,
        subscriptionId: `sub-${p[0]}`,
        code: VOD,
        start: oldStart,
        end: oldEnd,
        quantity: 2,
      },
    });
    for (let i = 1; i <= 2; i++) {
      const id = `personal-${p[0]}-${i}`;
      if (await db.video.findUnique({ where: { id } })) continue;
      const usage = await db.usage.create({
        data: { allocationId: allocation.id, status: "consumed" },
      });
      await db.video.create({
        data: {
          id,
          title:
            i === 1
              ? "Review của bạn: Giữ nhịp kinh tế vòng 3"
              : "Review của bạn: Tối ưu vị trí chủ lực",
          description:
            "Phản hồi cá nhân từ coach. Chỉ bạn và coach phụ trách có thể xem.",
          coachId: "coach-1",
          image: `/assets/video-${i + 2}.jpg`,
          duration: 1200,
          patch: "14.23",
          topic: "Cá nhân",
          level: "Nâng cao",
          visibility: "private",
          type: "personal_review",
          grants: { create: { userId } },
        },
      });
      await db.review.create({
        data: {
          id: `review-${p[0]}-${i}`,
          userId,
          coachId: "coach-1",
          usageId: usage.id,
          title: "Trận đấu chu kỳ trước",
          rank: p[1],
          focus: "Kinh tế",
          notes: "Dữ liệu mẫu",
          status: "completed",
          result: {
            create: {
              videoId: id,
              summary:
                "Điểm mạnh: giữ máu tốt đầu trận. Cần cải thiện: giữ mốc 50 vàng trước khi roll. Bài tập: ghi lại 3 quyết định kinh tế trong 5 trận tiếp theo.",
            },
          },
          source: {
            create: {
              fileId: "demo-file-12345",
              encryptedUrl: encrypt(
                "https://drive.google.com/file/d/demo-file-12345/view",
              ),
              access: "accessible",
            },
          },
        },
      });
    }
  }
  await db.enrollment.upsert({
    where: { userId: "demo-challenger" },
    update: {},
    create: {
      userId: "demo-challenger",
      status: "active",
      goal: "Ổn định quyết định, hướng tới Thách Đấu.",
      tasks: {
        create: [
          "Xem bài học về nhịp độ trận đấu",
          "Phân tích 3 trận có thứ hạng thấp",
          "Gửi VOD để coach nhận xét",
          "Check-in cùng coach cuối tuần",
        ].map((title) => ({ title })),
      },
    },
  });
  // Independent fixture accounts keep the four switchable demo members free
  // to submit a fresh VOD while coaches can explore every operational state.
  for (const status of [
    "needs_permission",
    "queued",
    "assigned",
    "in_review",
    "cancelled",
    "rejected",
  ]) {
    const id = `fixture-${status}`;
    if (await db.user.findUnique({ where: { id } })) continue;
    await db.user.create({
      data: {
        id,
        email: `${status}@ssc.demo`,
        displayName: `Học viên mẫu ${status === "queued" ? "An" : "Bình"}`,
        passwordHash: pw,
        verified: true,
      },
    });
    const subscription = await db.subscription.create({
      data: { userId: id, priceId: "price-master", start, end },
    });
    const a = await db.allocation.create({
      data: { subscriptionId: subscription.id, code: VOD, start, end },
    });
    const usage = await db.usage.create({
      data: {
        allocationId: a.id,
        status: ["cancelled", "rejected"].includes(status)
          ? "released"
          : ["assigned", "in_review"].includes(status)
            ? "consumed"
            : "reserved",
      },
    });
    await db.review.create({
      data: {
        userId: id,
        title: `Phân tích trận đấu — ${status === "needs_permission" ? "cần quyền Drive" : status === "queued" ? "chờ tiếp nhận" : status === "assigned" ? "đã phân công" : status === "in_review" ? "đang review" : "lịch sử xử lý"}`,
        rank: "Kim Cương",
        focus: "Kinh tế",
        notes: "Yêu cầu mẫu để trình diễn trạng thái nghiệp vụ.",
        status,
        usageId: usage.id,
        coachId: ["assigned", "in_review"].includes(status) ? "coach-1" : null,
        source: {
          create: {
            fileId: "sample-file-12345",
            encryptedUrl: encrypt(
              "https://drive.google.com/file/d/sample-file-12345/view",
            ),
            access:
              status === "needs_permission"
                ? "permission_required"
                : "accessible",
          },
        },
      },
    });
  }
  for (const completed of [false, true]) {
    const id = completed ? "sample-past-session" : "sample-upcoming-session";
    if (await db.booking.findUnique({ where: { id } })) continue;
    const userId = completed ? "demo-grandmaster" : "demo-challenger";
    const sub = await db.subscription.findUniqueOrThrow({
      where: { id: completed ? "sub-grandmaster" : "sub-challenger" },
    });
    const from = completed
      ? new Date(sub.start.getTime() - 30 * 86400000)
      : sub.start;
    const until = completed ? new Date(sub.start.getTime() - 1000) : sub.end;
    const allocation = await db.allocation.upsert({
      where: {
        subscriptionId_code_start: {
          subscriptionId: sub.id,
          code: COACHING,
          start: from,
        },
      },
      update: {},
      create: {
        subscriptionId: sub.id,
        code: COACHING,
        start: from,
        end: until,
      },
    });
    const usage = await db.usage.create({
      data: {
        allocationId: allocation.id,
        status: completed ? "consumed" : "reserved",
      },
    });
    const scheduled = new Date(Date.now() + (completed ? -7 : 3) * 86400000);
    scheduled.setUTCHours(11, 0, 0, 0);
    await db.booking.create({
      data: {
        id,
        userId,
        coachId: "coach-1",
        usageId: usage.id,
        start: scheduled,
        goal: "Cải thiện quyết định kinh tế và nhịp độ lên cấp.",
        status: completed ? "completed" : "scheduled",
        summary: completed
          ? "Đã xác định điểm cần cải thiện ở vòng 3. Bài tập: ghi lại mốc vàng và lý do lên cấp trong 5 trận tiếp theo."
          : null,
      },
    });
  }
  console.log("Đã tạo dữ liệu demo. Mật khẩu chung: Demo@12345");
}
main().finally(() => db.$disconnect());
