angular.module('clockInApp', ['angular-loading-bar']).controller('CollectedDataController', ($scope, $http, $filter) => {

    const INITIAL_BALANCE = 0;
    const eightHoursInMinutes = 480;
    const sixHourInMinutes = 360;
    let totalToWork = eightHoursInMinutes;
    const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    $scope.isLogged = false;
    $scope.date = new Date();
    $scope.count = {};
    $scope.clockSaved = {};
    $scope.remainingFormatted = '08:00';
    $scope.remaining = 0;

    const formatBalance = () => {
        $scope.balanceLabel = $scope.formatDuration($scope.balance, 'h [hrs], m [min]');
        $scope.balanceFilterLabel = $scope.formatDuration($scope.balanceFilter, 'h [hrs], m [min]');
        $scope.extraBalanceLabel = $scope.formatDuration($scope.extraBalance, 'h [hrs], m [min]');
    };

    const calcAndFormatPayments = payments => {
        $scope.totalMinutesPayed = payments.reduce((previousVal, currentVal) => previousVal + currentVal.minutes, 0)
        $scope.paymentsLabel = $scope.formatDuration($scope.totalMinutesPayed, 'HH:mm')
            + ' | R$ ' + Number(payments.reduce((previousVal, currentVal) => previousVal + currentVal.value, 0)).toFixed(2);
    };

    const totalBalanceCalc = data => {
        if (!data) return;

        const { clockIn = {}, payments = [] } = data;

        $scope.payments = payments;
        calcAndFormatPayments(payments);

        // $scope.initialBalance = $scope.formatDuration(INITIAL_BALANCE, 'h [hours], m [minutes]');

        $scope.balance = (clockIn.totalMinutes || 0) + INITIAL_BALANCE;
        $scope.balanceFilter = $scope.balance - INITIAL_BALANCE;
        $scope.extraBalance = clockIn.totalExtra || 0;

        formatBalance();

        // $scope.extraAcelerationBalance = items.reduce((previousVal, currentVal) => previousVal + currentVal.totalExtraAceleration, 0);
        // $scope.extraAcelerationBalanceLabel = $scope.formatDuration($scope.extraAcelerationBalance, 'h [hours], m [minutes]');
        // //8(hrs)*5(dias)*4(semanas)*8(meses)=1280(hrs)*20%=256(hrs) = 15360min[20%] -> 76800min[100%]
        // const resultPercent = $scope.extraAcelerationBalance * 100 / 76800;
        // $scope.extraPercent = Number(resultPercent).toFixed(parseInt(resultPercent) === 0 ? 1 : 0);
    };

    const totalFilterBalanceCalc = (clockIn = []) => {
        if (!clockIn) return;

        $scope.balance = clockIn.reduce((previousVal, currentVal) => previousVal + currentVal.minutes, 0) + INITIAL_BALANCE;
        $scope.balanceFilter = $scope.balance - INITIAL_BALANCE;
        $scope.extraBalance = clockIn.reduce((previousVal, currentVal) => previousVal + currentVal.extraHour, 0);

        formatBalance();

        // calcAndFormatPayments($scope.payments.filter(p => new Date(p.date));
    };

    const clearHours = () => {
        $scope.hour01 = {};
        $scope.hour02 = {};
        $scope.hour03 = {};
        $scope.hour04 = {};
        $scope.hour05 = {};
        $scope.hour06 = {};
        $scope.clockSaved = {};
        $scope.count = {};
        $scope.divergence = {
            positive: [],
            negative: [],
            extra: [],
            extraAceleration: [],
            nextDay: [],
            worked_hours: '8'
        };
    };

    const encode = input => {
        var output = '';
        var chr1, chr2, chr3 = '';
        var enc1, enc2, enc3, enc4 = '';
        var i = 0;

        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                keyStr.charAt(enc1) +
                keyStr.charAt(enc2) +
                keyStr.charAt(enc3) +
                keyStr.charAt(enc4);
            chr1 = chr2 = chr3 = '';
            enc1 = enc2 = enc3 = enc4 = '';
        } while (i < input.length);

        return output;
    };

    const addHours = (divergence, hour) => {
        if (!hour.time) return;
        const time = $filter('date')(hour.time, 'HH:mm');

        if (hour.isNextDay)
            divergence.nextDay.push(time);

        switch (hour.type) {
            case 'P':
                divergence.positive.push(time);
                break;
            case 'N':
                divergence.negative.push(time);
                break;
            case 'E':
                divergence.extra.push(time);
                break;
            case 'A':
                divergence.extraAceleration.push(time);
                break;
            default:
                break;
        }
        return time;
    };

    const getType = (hour, divergence) => {
        const { negative, positive, extra, extraAceleration } = divergence;

        if (hour) {
            if (Array.isArray(negative) && negative.includes(hour))
                return 'N';
            if (Array.isArray(positive) && positive.includes(hour))
                return 'P';
            if (Array.isArray(extra) && extra.includes(hour))
                return 'E';
            if (Array.isArray(extraAceleration) && negative.includes(hour))
                return 'A';
        }

    };

    const isNextDay = (hour, divergence) => {
        const { nextDay } = divergence;
        return hour && Array.isArray(nextDay) && nextDay.includes(hour);
    };

    const isPositive = (hour, divergence) => {
        const { positive } = divergence;
        return hour && Array.isArray(positive) && positive.includes(hour);
    };

    const isNegative = (hour, divergence) => {
        const { negative } = divergence;
        return hour && Array.isArray(negative) && negative.includes(hour);
    };

    const getClocks = () => {
        $scope.items = [];
        return $http.get(`clocks?tolerance=${$scope.toUseTolerance}`)
            .then(response => {
                $scope.items = response.data.clockIn.divergences;
                totalBalanceCalc(response.data);
            })
            .catch(err => {
                let msg = 'Erro interno, consulte o log ;)';
                if (err.status === 403)
                    msg = 'Usuário sem acesso';
                alert(msg);
                console.error(err); //eslint-disable-line
                $('#modal_login').modal('show');
            });
    };

    const getDuration = (h_2, h_1) => {
        const initialTime = moment({ hour: h_1[0], minute: h_1[1] });
        const endTime = moment({ hour: h_2[0], minute: h_2[1] });
        return endTime.diff(initialTime, 'm');
    };

    $('input[name="daterange"]').daterangepicker({ autoApply: true, locale: { format: 'DD/MM/YYYY' } });

    $scope.normalDay = () => {
        $scope.hour01 = { time: new Date(1970, 0, 1, 9, 0, 0) };
        $scope.hour02 = { time: new Date(1970, 0, 1, 12, 0, 0) };
        $scope.hour03 = { time: new Date(1970, 0, 1, 13, 0, 0) };
        $scope.hour04 = { time: new Date(1970, 0, 1, 18, 0, 0) };
    };

    $scope.updateCount = () => {
        $scope.count = {};
        if ($scope.divergence.worked_hours === '8') {
            $scope.count.hour01 = '09:00';
            $scope.count.hour04 = '18:00';
        } else {
            totalToWork = sixHourInMinutes;
            $scope.count.hour01 = '09:00';
            $scope.count.hour04 = '16:30';
        }

        $scope.count.hour02 = '12:00';
        if ($scope.clockSaved.hour02 && !$scope.clockSaved.hour03) {
            $scope.count.hour03 = moment(`1970-01-01 ${$scope.clockSaved.hour02}`).add(1, 'h').format('HH:mm');
        } else {
            $scope.count.hour03 = '13:00';
        }

        if (!$scope.clockSaved.hour04) {
            const h01 = $scope.clockSaved.hour01 || $scope.count.hour01;
            const h02 = $scope.clockSaved.hour02 || $scope.count.hour02;
            const duration = getDuration(h02.split(':'), h01.split(':'));
            $scope.count.hour04 = moment(`1970-01-01 ${$scope.clockSaved.hour03 || $scope.count.hour03}`)
                .add($scope.divergence.worked_hours === '8' ? eightHoursInMinutes - duration : sixHourInMinutes - duration, 'm')
                .format('HH:mm');
        }

        $scope.remaining = totalToWork - ($scope.divergence.totalWorked || 0);
        $scope.totalWorkedFormatted = $scope.formatDuration($scope.divergence.totalWorked || 0);
        $scope.remainingFormatted = $scope.formatDuration($scope.remaining < 0 ? 0 : $scope.remaining);
    };

    $scope.getClockByDate = () => {
        clearHours();
        const today = $filter('date')($scope.date, 'EEEE, dd/MM/yyyy');
        return $http.get(`clocks?date=${today}`)
            .then(response => {
                let { clockIn } = response.data;
                if (clockIn && clockIn.divergences.length) {
                    $scope.clockIn = clockIn;
                    $scope.divergence = clockIn.divergences[0];
                    const { hours: strHours } = $scope.divergence;
                    const arrHours = strHours.split(' ');
                    for (let index = 0; index < arrHours.length; index++) {
                        const hour = arrHours[index];

                        $scope.clockSaved[`hour0${index + 1}`] = hour;
                        $scope.clockSaved[`isNegative0${index + 1}`] = isNegative(hour, $scope.divergence);
                        $scope.clockSaved[`isPositive0${index + 1}`] = isPositive(hour, $scope.divergence);

                        const hours = hour.split(':');
                        const objHour = $scope[`hour0${index + 1}`];
                        objHour.time = new Date(1970, 0, 1, hours[0], hours[1], 0);
                        objHour.type = getType(hour, $scope.divergence);
                        objHour.isNextDay = isNextDay(hour, $scope.divergence);
                    }
                } else {
                    const isWeekEnd = moment($scope.date).isoWeekday() > 5;
                    const is8Clock = $scope.divergence.worked_hours === '8';
                    $scope.divergence.hoursWorked = '00:00';
                    $scope.divergence.minutesFormated = isWeekEnd ? '00:00' : is8Clock ? '-08:00' : '-06:00';
                    $scope.divergence.extraHourFormated = '00:00';
                    $scope.divergence.minutes = isWeekEnd ? 0 : is8Clock ? -eightHoursInMinutes : -sixHourInMinutes;
                    $scope.divergence.extraHour = 0;
                    $scope.divergence.extraHourAceleration = 0;
                }
                $scope.updateCount();
            })
            .catch(err => {
                let msg = 'Erro interno, consulte o log ;)';
                if (err.status === 403)
                    msg = 'Usuário sem acesso';
                alert(msg);
                console.error(err); //eslint-disable-line
                $('#modal_login').modal('show');
            });
    };

    const separeDateFilter = () => {
        const filterDate = angular.copy($scope.query);
        const dataChangedReplace = filterDate.replace(new RegExp(' ', 'g'), '');
        const dateChanged = dataChangedReplace.split('-');
        const dateFrom = dateChanged[0];
        const dateTo = dateChanged[1];
        return { dateFrom, dateTo };
    };

    $scope.search = divergence => {
        if (angular.isDefined($scope.query)) {

            const filterDate = angular.copy($scope.query);

            let resultFilterDate;
            if (angular.isDefined(filterDate)) {
                const dataChangedReplace = filterDate.replace(new RegExp(' ', 'g'), '');
                const dateChanged = dataChangedReplace.split('-');
                const dateFrom = dateChanged[0];
                const dateTo = dateChanged[1];
                const d1 = dateFrom.split('/');
                const d2 = dateTo.split('/');
                const from = new Date(d1[2], d1[1] - 1, d1[0]);
                const to = new Date(d2[2], d2[1] - 1, d2[0]);
                const dateCheck = $filter('date')(moment(divergence.date).format('DD/MM/YYYY'), 'dd/MM/yyyy');
                const c = dateCheck.split('/');
                const check = new Date(c[2], c[1] - 1, c[0]);
                return check >= from && check <= to;
            }
            return resultFilterDate;
        } else {
            return divergence;
        }
    };

    $scope.$watchCollection('itemsFiltered', (newList, oldList) => {
        if (!newList || !oldList || oldList.length === 0 || newList.length === oldList.length) return;
        totalFilterBalanceCalc(newList);
    });

    $scope.login = auth => {
        const authData = encode(`${auth.user}:${auth.password}`);
        $http.defaults.headers.common['Authorization'] = 'Basic ' + authData;
        $http.post('login')
            .then(() => {
                sessionStorage.user = auth.user;
                sessionStorage.password = auth.password;
                $scope.getClockByDate().then(() => {
                    $('#modal_login').modal('hide');
                    $scope.isLogged = true;
                });
            })
            .catch(err => {
                let msg = 'Erro interno, consulte o log ;)';
                if (err.status === 403)
                    msg = `Usuário '${auth.user}' não tem acesso`;
                alert(msg);
                console.error(err); //eslint-disable-line
                $('#modal_login').modal('show');
            });
    };

    $scope.onSaveHours = () => {
        const times = [];
        const { isHoliday, dayOff, middayOff } = $scope.divergence;
        $scope.divergence = {
            positive: [],
            negative: [],
            extra: [],
            extraAceleration: [],
            nextDay: [],
            worked_hours: $scope.divergence.worked_hours,
            isHoliday,
            dayOff,
            middayOff
        };
        times.push(addHours($scope.divergence, $scope.hour01));
        times.push(addHours($scope.divergence, $scope.hour02));
        times.push(addHours($scope.divergence, $scope.hour03));
        times.push(addHours($scope.divergence, $scope.hour04));
        times.push(addHours($scope.divergence, $scope.hour05));
        times.push(addHours($scope.divergence, $scope.hour06));

        $scope.divergence.date = $filter('date')($scope.date, 'EEEE, dd/MM/yyyy');
        $scope.divergence.hours = times.join(' ').trim();

        $http.post('clocks', $scope.divergence)
            .then(response => {
                if (response.status === 200) {
                    $scope.getClockByDate();
                } else {
                    alert('Erro interno, consulte o log ;)');
                }
            })
            .catch(err => {
                alert('Erro interno, consulte o log ;)');
                console.error(err);//eslint-disable-line
            });
    };

    $('#modal_list_hours').on('show.bs.modal', () => {
        getClocks();
        $scope.$apply();
    });

    $scope.onDelete = id => {
        if (confirm('Confirma delete???')) {
            $http.delete(`clocks/${id}`)
                .then(response => {
                    if (response.status === 200) {
                        getClocks();
                    } else {
                        alert('Erro interno, consulte o log ;)');
                    }
                })
                .catch(err => {
                    alert('Erro interno, consulte o log ;)');
                    console.error(err);//eslint-disable-line
                });
        }
    };

    $scope.getBalanceByDayInMonth = (index, itens) => {
        let balance = 0;
        for (let i = itens.length - 1; i >= 0; i--) {
            if (i >= index)
                balance += itens[i].minutes + (itens[i].fixed || 0);
            else
                break;
        }
        return $scope.formatDuration(balance);
    };

    $scope.formatDuration = (min, formatter = 'HH:mm') => moment.duration(min, 'minutes').format(formatter, { trim: false });

    clearHours();
    // $scope.isLogged = true;
    sessionStorage.user ? $scope.login({ user: sessionStorage.user, password: sessionStorage.password }) : $('#modal_login').modal('show');
}).config(['cfpLoadingBarProvider', (cfpLoadingBarProvider) => {
    cfpLoadingBarProvider.includeSpinner = false;
}]);