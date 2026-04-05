""" import cv2
import mediapipe as mp
import numpy as np
from scipy.spatial import distance as dist
import pygame

# ---------- INITIAL SETTINGS ----------
EYE_AR_THRESH = 0.25
EYE_AR_CONSEC_FRAMES = 20
YAWN_THRESH = 25

COUNTER = 0
alarm_on = False

# ---------- INIT SOUND ----------
pygame.mixer.init()
pygame.mixer.music.load("Alert.wav")

def start_alarm():
    if not pygame.mixer.music.get_busy():
        pygame.mixer.music.play(-1)   # loop sound

def stop_alarm():
    pygame.mixer.music.stop()

def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    return (A + B) / (2.0 * C)

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    frame = cv2.resize(frame, (640, 480))
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    drowsy_detected = False
    yawn_detected = False

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:

            h, w, _ = frame.shape

            left_eye_idx = [33,160,158,133,153,144]
            right_eye_idx = [362,385,387,263,373,380]
            mouth_idx = [13,14]

            left_eye = []
            right_eye = []

            for idx in left_eye_idx:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                left_eye.append((x,y))

            for idx in right_eye_idx:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                right_eye.append((x,y))

            ear = (eye_aspect_ratio(left_eye) + 
                   eye_aspect_ratio(right_eye)) / 2.0

            top = face_landmarks.landmark[mouth_idx[0]]
            bottom = face_landmarks.landmark[mouth_idx[1]]
            distance = abs((top.y - bottom.y) * h)

            # ---------- DROWSINESS ----------
            if ear < EYE_AR_THRESH:
                COUNTER += 1
                if COUNTER >= EYE_AR_CONSEC_FRAMES:
                    drowsy_detected = True
                    cv2.putText(frame, "DROWSINESS ALERT!", (20, 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)
            else:
                COUNTER = 0

            # ---------- YAWN ----------
            if distance > YAWN_THRESH:
                yawn_detected = True
                cv2.putText(frame, "YAWN ALERT!", (20, 100),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)

            cv2.putText(frame, f"EAR: {ear:.2f}", (450, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

    # ---------- SOUND CONTROL ----------
    if drowsy_detected or yawn_detected:
        start_alarm()
    else:
        stop_alarm()

    cv2.imshow("Drowsiness Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
pygame.mixer.quit()
 """
 
 
 
# color the eyes as well as lower lips
 
import cv2
import mediapipe as mp
import numpy as np
from scipy.spatial import distance as dist
import pygame

# ---------------- SETTINGS ----------------
EYE_AR_THRESH = 0.25
EYE_AR_CONSEC_FRAMES = 20
YAWN_THRESH = 25

COUNTER = 0

# ---------------- SOUND INIT ----------------
pygame.mixer.init()
pygame.mixer.music.load("Alert.wav")

def start_alarm():
    if not pygame.mixer.music.get_busy():
        pygame.mixer.music.play(-1)   # Loop continuously

def stop_alarm():
    pygame.mixer.music.stop()

# ---------------- EAR FUNCTION ----------------
def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    return (A + B) / (2.0 * C)

# ---------------- MEDIAPIPE INIT ----------------
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    frame = cv2.resize(frame, (640, 480))
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    drowsy_detected = False
    yawn_detected = False

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:

            h, w, _ = frame.shape

            # ---------------- EYE LANDMARKS ----------------
            left_eye_idx = [33,160,158,133,153,144]
            right_eye_idx = [362,385,387,263,373,380]
            mouth_top = 13
            mouth_bottom = 14

            left_eye = []
            right_eye = []

            for idx in left_eye_idx:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                left_eye.append((x,y))

            for idx in right_eye_idx:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                right_eye.append((x,y))

            # ---------------- EAR CALCULATION ----------------
            ear = (eye_aspect_ratio(left_eye) + 
                   eye_aspect_ratio(right_eye)) / 2.0

            # Convert to numpy
            left_eye_np = np.array(left_eye, np.int32)
            right_eye_np = np.array(right_eye, np.int32)

            # Default eye color (Green)
            eye_color = (0, 255, 0)

            if ear < EYE_AR_THRESH:
                eye_color = (0, 0, 255)
                COUNTER += 1
                if COUNTER >= EYE_AR_CONSEC_FRAMES:
                    drowsy_detected = True
                    cv2.putText(frame, "DROWSINESS ALERT!", (20, 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)
            else:
                COUNTER = 0

            # Draw eyes always
            cv2.polylines(frame, [left_eye_np], True, eye_color, 2)
            cv2.polylines(frame, [right_eye_np], True, eye_color, 2)

            # ---------------- YAWN DETECTION ----------------
            top = face_landmarks.landmark[mouth_top]
            bottom = face_landmarks.landmark[mouth_bottom]
            distance = abs((top.y - bottom.y) * h)

            # Lip indices (outer lips)
            lip_idx = [61,146,91,181,84,17,314,405,321,375,291]
            lips = []

            for idx in lip_idx:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                lips.append((x,y))

            lips_np = np.array(lips, np.int32)

            lip_color = (255, 0, 0)  # Blue default

            if distance > YAWN_THRESH:
                lip_color = (0, 0, 255)
                yawn_detected = True
                cv2.putText(frame, "YAWN ALERT!", (20, 100),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)

            # Draw lips always
            cv2.polylines(frame, [lips_np], True, lip_color, 2)

            cv2.putText(frame, f"EAR: {ear:.2f}", (450, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

    # ---------------- SOUND CONTROL ----------------
    if drowsy_detected or yawn_detected:
        start_alarm()
    else:
        stop_alarm()

    cv2.imshow("Real-Time Drowsiness Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
pygame.mixer.quit()
