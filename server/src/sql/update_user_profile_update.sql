UPDATE users
SET
  username = CASE WHEN %s THEN %s ELSE username END,
  email    = CASE WHEN %s THEN %s ELSE email END,
  gender   = CASE WHEN %s THEN %s ELSE gender END,
  age      = CASE WHEN %s THEN %s ELSE age END,
  street   = CASE WHEN %s THEN %s ELSE street END,
  city     = CASE WHEN %s THEN %s ELSE city END,
  province = CASE WHEN %s THEN %s ELSE province END,
  mbti     = CASE WHEN %s THEN %s ELSE mbti END
WHERE uid = %s;
