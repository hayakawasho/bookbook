# クリーンコード

コードの可読性に関する基準。各節で Bad / Good のコード例を示す。

---

## 目次

- [クリーンコード](#クリーンコード)
  - [目次](#目次)
  - [早期リターン（ガード節）](#早期リターンガード節)
  - [条件に名前をつける](#条件に名前をつける)
  - [関数の抽出](#関数の抽出)
  - [関数のインライン化](#関数のインライン化)
  - [コメント](#コメント)

---

## 早期リターン（ガード節）

異常系・例外ケースを関数の先頭で `return` して抜ける。正常系の処理がフラットになり、読み進めやすくなる。

**Bad** — 正常系がネストの奥に埋まっている

```typescript
function processOrder(order: Order | null) {
  if (order !== null) {
    if (order.items.length > 0) {
      if (order.isPaid) {
        ship(order);
      }
    }
  }
}
```

**Good** — 異常系を先に弾いて正常系をフラットに保つ

```typescript
function processOrder(order: Order | null) {
  if (order === null) {
    return;
  }

  if (order.items.length === 0) {
    return;
  }

  if (!order.isPaid) {
    return;
  }

  ship(order);
}
```

---

## 条件に名前をつける

複雑な条件式には意図を表す名前をつけて変数に置く。条件そのものより「何を判定しているか」が伝わりやすくなる。同じ目的で関数に切り出す例は [関数の抽出](#関数の抽出) を参照する。

**Bad** — 条件式を読み解かないと意味が分からない

```typescript
if (
  user.role === 'staff' &&
  !user.isSuspended &&
  (permission.level >= 2 || user.isAdmin)
) {
  showDashboard();
}
```

**Good** — 意図を表す名前を変数に切り出す

```typescript
const isActiveStaff = user.role === 'staff' && !user.isSuspended;
const hasAccess = permission.level >= 2 || user.isAdmin;

if (isActiveStaff && hasAccess) {
  showDashboard();
}
```

---

## 関数の抽出

「何をしているか」を説明するコメントを書きたくなったとき、その処理を関数として切り出す。コメントの代わりに関数名が意図を語る。変数で条件に名前をつける例は [条件に名前をつける](#条件に名前をつける)。不要な関数分割をやめる例は [関数のインライン化](#関数のインライン化)。

**Bad** — 1 つの関数に複数の関心事が詰まっている

```typescript
async function handleSubmit(formData: FormData) {
  // バリデーション
  const name = formData.get('name');

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('名前は必須です');
  }

  const email = formData.get('email');

  if (typeof email !== 'string' || !email.includes('@')) {
    throw new Error('メールアドレスの形式が正しくありません');
  }

  // API 送信
  const payload = { name: name.trim(), email };

  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
```

**Good** — 関心事ごとに関数を切り出す

```typescript
async function handleSubmit(formData: FormData) {
  const payload = validateUserForm(formData);

  await createUser(payload);
}

function validateUserForm(formData: FormData) {
  const name = formData.get('name');

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('名前は必須です');
  }

  const email = formData.get('email');

  if (typeof email !== 'string' || !email.includes('@')) {
    throw new Error('メールアドレスの形式が正しくありません');
  }

  return { name: name.trim(), email };
}

async function createUser(payload: { name: string; email: string }) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('ユーザーの作成に失敗しました');
  }
}
```

**Bad** — 条件の詳細が呼び出し元にあふれ、業務上の意味が読み取りにくい

```typescript
if (
  reservation.status === 'confirmed' &&
  !reservation.isCancelled &&
  reservation.checkInDate === today
) {
  showCheckInAction();
}
```

**Good** — 条件の意味を関数名で表し、呼び出し元では判断の意図だけを読む

```typescript
if (canCheckInToday(reservation, today)) {
  showCheckInAction();
}

function canCheckInToday(reservation: Reservation, today: string) {
  return (
    reservation.status === 'confirmed' &&
    !reservation.isCancelled &&
    reservation.checkInDate === today
  );
}
```

---

## 関数のインライン化

関数名よりも本体の方が読みやすいときは、呼び出し元へ処理を戻す。名前が意図を語る場合や、詳細を隠して呼び出し元を読みやすくする場合は、関数として抽出したままにする。いつ抽出するかは [関数の抽出](#関数の抽出) を参照する。

**Bad** — 関数名が実装の言い換えで、間接参照だけが増えている

```typescript
function getReservationLabel(reservation: Reservation) {
  return buildReservationLabel(reservation);
}

function buildReservationLabel(reservation: Reservation) {
  return `${reservation.guestName} / ${reservation.roomName}`;
}
```

**Good** — 自明な処理は呼び出し元に置き、流れを追いやすくする

```typescript
function getReservationLabel(reservation: Reservation) {
  return `${reservation.guestName} / ${reservation.roomName}`;
}
```

---

## コメント

コードで意図を表現する。コメントは「なぜそうするか」の説明にのみ使う。関数名・変数名から読み取れる内容を繰り返すコメントは書かない。

※ Storybook などでドキュメント化される Props や公開 API には JSDoc も使う。実装の言い直しではなく、利用者が知るべき「何をするか」「どう使うか」を書く。内部の動機や制約の説明は、コードコメントで「なぜ」を補う。

**Bad** — コードの言い直しになっている

```typescript
// ユーザーを取得する
const user = await getUser(userId);

// 配列をフィルタリングする
const activeUsers = users.filter((u) => {
  return u.isActive;
});
```

**Good** — コードが意図を語り、コメントは「なぜ」だけを伝える

```typescript
const user = await getUser(userId);
const activeUsers = users.filter((u) => {
  return u.isActive;
});

// 退会済みユーザーをキャッシュから除外する（個人情報保護方針に基づく）
cache.remove(deletedUserIds);
```
