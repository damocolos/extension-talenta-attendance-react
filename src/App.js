import './App.css';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [history, setHistory] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profile, setProfile] = useState({});
  const [config, setConfig] = useState({});
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [optionsForm, setOptionsForm] = useState({});
  const [isInvalidToken, setIsInvalidToken] = useState(false);

  const URL = 'https://resilient-cat-092f6d.netlify.app/.netlify/functions/api';

  useEffect(() => {
    chrome.storage.sync.get('talentaConfig', ({ talentaConfig }) => {
      setConfig(talentaConfig);
      setOptionsForm(talentaConfig);
    });
  }, []);

  useEffect(() => {
    if (config.authCookie && config.authCookie != '') {
      getHistory();
      getUserProfile();
    }
  }, [config]);

  const onToggleOptions = () => {
    setShowOptions(!showOptions);
  };

  const onSaveOption = () => {
    setIsLoadingOptions(true);
    chrome.storage.sync.set(
      {
        talentaConfig: optionsForm,
      },
      function () {
        setConfig(optionsForm);
        setTimeout(() => {
          setIsLoadingOptions(false);
          setShowOptions(false);
        }, 500);
      }
    );
  };

  const handleChange = (i, event) => {
    let values = { ...optionsForm };
    values[i] = event.target.value;
    setOptionsForm(values);
  };

  const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${('0' + (today.getMonth() + 1)).slice(
      -2
    )}-${today.getDate()}`;
  };

  const getTodayDateLong = () => {
    const today = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return today.toLocaleDateString('en-GB', options);
  };

  const getHistory = async () => {
    setIsLoadingHistory(true);
    setIsInvalidToken(false);

    try {
      const resp = await axios({
        method: 'post',
        url: `${URL}/history`,
        data: {
          token: config.authCookie,
          date: getTodayDate(),
        },
      });

      if (resp?.data) {
        const respHistory = resp.data;

        setHistory([]);

        if (respHistory.length) {
          const result = respHistory.map((j) => ({
            type: j.check_type === 1 ? 'clockin' : 'clockout',
            time: j.check_time,
          }));

          setHistory(result);

          for (const r of result) {
            if (r.type === 'clockin' && attendanceStatus !== 3) {
              setAttendanceStatus(2);
            } else if (r.type === 'clockout') {
              setAttendanceStatus(3);
            }
          }
        } else {
          setAttendanceStatus(1);
        }
      }
    } catch (err) {
      if (err?.response?.data?.status == 401) {
        setIsInvalidToken(true);
      }
    }

    setIsLoadingHistory(false);
  };

  const getUserProfile = async () => {
    setIsLoadingProfile(true);
    setIsInvalidToken(false);

    try {
      const resp = await axios({
        method: 'post',
        url: `${URL}/profile`,
        data: {
          token: config.authCookie,
        },
      });
      if (resp?.data) {
        setProfile(resp.data);
      }
    } catch (err) {
      if (err?.response?.data?.status == 401) {
        setIsInvalidToken(true);
      }
    }

    setIsLoadingProfile(false);
  };

  const onClock = async (type) => {
    setIsLoading(true);

    const resp = await axios({
      method: 'post',
      url: `${URL}/live-attendance`,
      data: {
        token: config.authCookie,
        latitude: config.latitude,
        longitude: config.longitude,
        type: type === 3 ? 'checkout' : 'checkin',
      },
    });

    if (resp) {
      setTimeout(() => {
        getHistory();
      }, 1000);
    }

    setIsLoading(false);
  };

  return (
    <div className='App'>
      {!showOptions && (
        <>
          <h5>Talenta Live Attendance</h5>

          {config.authCookie !== '' && (
            <div id='content'>
              {isInvalidToken && (
                <p>Invalid credentials. Please check token and try again</p>
              )}
              {isLoadingProfile && <p>Loading Profile...</p>}
              {!isLoadingProfile && (
                <>
                  {profile?.full_name && (
                    <strong>
                      <p id='greeting'>Halo {profile?.full_name}</p>
                    </strong>
                  )}
                  {!isInvalidToken && <p>Today {getTodayDateLong()}</p>}
                </>
              )}
              {isLoadingHistory && <p>Loading History...</p>}
              {!isLoadingHistory && (
                <>
                  <div id='list'>
                    {history.length > 0 &&
                      history.map((h) => (
                        <p key={h.time}>
                          {h.type} - {h.time}
                        </p>
                      ))}
                  </div>

                  {attendanceStatus === 1 && (
                    <>
                      <p>You haven&lsquo;t made attendance today</p>
                      <button onClick={() => onClock(2)} disabled={isLoading}>
                        {isLoading ? 'loading...' : 'Clockin'}
                      </button>
                    </>
                  )}
                  {attendanceStatus === 2 && (
                    <button onClick={() => onClock(3)} disabled={isLoading}>
                      {isLoading ? 'loading...' : 'Clockout'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {config.authCookie === '' && (
            <p>Settings not found, please update the setting</p>
          )}

          <button onClick={onToggleOptions}>Setting</button>
        </>
      )}

      {showOptions && (
        <>
          <h5>Talenta Live Attendance Setting</h5>

          <fieldset>
            <label>Token</label>
            <input
              type='text'
              value={optionsForm.authCookie}
              onChange={(event) => handleChange('authCookie', event)}
              name='token'
            />

            <label>Latitude</label>
            <input
              type='text'
              value={optionsForm.latitude}
              onChange={(event) => handleChange('latitude', event)}
              name='latitude'
            />

            <label>Longitude</label>
            <input
              type='text'
              value={optionsForm.longitude}
              onChange={(event) => handleChange('longitude', event)}
              name='longitude'
            />

            <div>
              <button onClick={onSaveOption} disbaled={isLoadingOptions}>
                {isLoadingOptions ? 'loading...' : 'Save'}
              </button>
            </div>
            <div>
              <button onClick={onToggleOptions}>Cancel</button>
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
}

export default App;
